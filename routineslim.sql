USE routineslim;
SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS seed_routineslim_demo;

DELIMITER $$

CREATE PROCEDURE seed_routineslim_demo()
BEGIN
    DECLARE v_member BINARY(16);
    DECLARE v_sub BINARY(16);
    DECLARE v_category BINARY(16);
    DECLARE v_rec BINARY(16);

    DECLARE v_card BIGINT;
    DECLARE v_method BIGINT;
    DECLARE v_sub_category BIGINT;
    DECLARE v_post BIGINT;

    DECLARE v_i INT DEFAULT 1;
    DECLARE v_created INT DEFAULT 0;
    DECLARE v_usage_created INT DEFAULT 0;

    DECLARE v_amount INT;
    DECLARE v_name VARCHAR(100);
    DECLARE v_category_name VARCHAR(50);
    DECLARE v_old_name VARCHAR(100);
    DECLARE v_old_memo TEXT;
    DECLARE v_owner BINARY(16);

    DECLARE v_due DATE;
    DECLARE v_start DATE;
    DECLARE v_paid DATE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- 최신 서버의 테이블이 먼저 생성되어 있어야 합니다.
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'usage_check'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                '최신 서버의 V1~V5 테이블을 먼저 준비해주세요. usage_check가 없습니다.';
    END IF;

    START TRANSACTION;

    -- 기존 회원의 비밀번호·이름·예산은 변경하지 않습니다.
    INSERT INTO member (
        member_id,
        member_name,
        member_password,
        name,
        monthly_budget
    )
    VALUES (
        UUID_TO_BIN(UUID()),
        'mbheum654',
        '$2a$10$AFpw0BuK/RSLPHlT0PnwgeEYqMh5gqR0XbW9cdyQs7I.AUix/CUc2',
        '데모 사용자',
        200000
    )
    ON DUPLICATE KEY UPDATE
        member_name = member.member_name;

    SELECT member_id
    INTO v_member
    FROM member
    WHERE member_name = 'mbheum654'
      AND deleted_at IS NULL
    FOR UPDATE;

    IF v_member IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                '사용 가능한 mbheum654 계정이 없습니다. 탈퇴 여부를 확인해주세요.';
    END IF;

    INSERT INTO expense_method (method_name)
    SELECT '[더미] 테스트 결제'
    WHERE NOT EXISTS (
        SELECT 1
        FROM expense_method
        WHERE method_name = '[더미] 테스트 결제'
    );

    SELECT expense_method_id
    INTO v_method
    FROM expense_method
    WHERE method_name = '[더미] 테스트 결제';

    WHILE v_i <= 10 DO

        SET v_name = ELT(
            v_i,
            '넷플릭스 (더미)',
            '디즈니+ (더미)',
            'YouTube Premium (더미)',
            '스포티파이 (더미)',
            'Apple Music (더미)',
            'iCloud+ (더미)',
            'Google One (더미)',
            '쿠팡 와우 (더미)',
            '네이버플러스 멤버십 (더미)',
            '웨이브 (더미)'
        );

        -- 화면 확인용 예시 금액입니다.
        SET v_amount = ELT(
            v_i,
            17000, 9900, 14900, 10900, 8900,
            1100, 3000, 7890, 4900, 7900
        );

        -- 최신 서버 V2의 기본 카테고리를 사용합니다.
        SET v_category_name = CASE
            WHEN v_i IN (1, 2, 3, 10) THEN 'OTT'
            WHEN v_i IN (4, 5) THEN '음악'
            WHEN v_i IN (6, 7) THEN '클라우드'
            ELSE '쇼핑'
        END;

        SET v_sub_category = (
            SELECT sub_ctg_id
            FROM subscription_category
            WHERE category_name = v_category_name
        );

        IF v_sub_category IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'V2 기본 카테고리 OTT/음악/클라우드/쇼핑이 필요합니다.';
        END IF;

        -- 실행일 기준 1~10일 뒤 결제 예정입니다.
        SET v_due = DATE_ADD(
            CURRENT_DATE(),
            INTERVAL v_i DAY
        );

        -- 시작일과 원래 결제일을 일치시킵니다.
        SET v_start = DATE_SUB(
            v_due,
            INTERVAL 3 MONTH
        );

        IF DAY(v_start) <> DAY(v_due) THEN
            SET v_start = DATE_SUB(
                v_due,
                INTERVAL 2 MONTH
            );
        END IF;

        -- 신규 지출·청구 기록: 이번 달 5건, 지난달 5건.
        SET v_paid = CASE
            WHEN v_i <= 5 THEN CURRENT_DATE()
            ELSE DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
        END;

        -- 이전 SQL과 동일한 ID로 중복 생성을 방지합니다.
        SET v_sub = UNHEX(MD5(CONCAT(
            'routineslim-demo-v1-sub-',
            HEX(v_member),
            '-',
            v_i
        )));

        SET v_category = UNHEX(MD5(CONCAT(
            'routineslim-demo-v1-category-',
            HEX(v_member),
            '-',
            v_i
        )));

        SET v_rec = UNHEX(MD5(CONCAT(
            'routineslim-demo-v1-rec-',
            HEX(v_member),
            '-',
            v_i
        )));

        IF EXISTS (
            SELECT 1
            FROM subscription
            WHERE sub_id = v_sub
        ) THEN

            SELECT member_id, name, memo
            INTO v_owner, v_old_name, v_old_memo
            FROM subscription
            WHERE sub_id = v_sub;

            -- 원래 더미 데이터임을 확인한 경우에만 보정합니다.
            IF v_owner <> v_member
               OR COALESCE(v_old_memo, '') NOT IN (
                   '[더미:v1] 화면 확인용',
                   '[더미:v1] 화면과 데이터 연동 확인용',
                   '[더미:v2] 웹 연동 확인용'
               )
            THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT =
                        '더미 식별자와 다른 데이터가 충돌했습니다. 변경하지 않고 취소합니다.';
            END IF;

            -- 과거 지출·청구 내역은 변경하지 않습니다.
            UPDATE subscription
            SET
                name = v_name,
                sub_ctg_id = v_sub_category,
                amount = v_amount,
                currency = 'KRW',
                billing_cycle = 'MONTHLY',
                cycle_interval = 1,
                start_date = v_start,
                billing_day = DAY(v_due),
                next_billing_date = v_due,
                memo = '[더미:v2] 웹 연동 확인용'
            WHERE sub_id = v_sub;

            UPDATE schedule
            SET
                title = CONCAT(v_name, ' 결제 예정'),
                payment_date = TIMESTAMP(v_due, '09:00:00')
            WHERE member_id = v_member
              AND title = CONCAT(v_old_name, ' 결제 예정')
              AND description = '[더미:v1] 캘린더 표시 확인용'
              AND payment_status = 'PENDING';

        ELSE

            -- 1. 카드
            INSERT INTO card (
                member_id,
                card_name,
                payment_day
            )
            VALUES (
                v_member,
                CONCAT('[더미] 테스트 카드 ', v_i),
                v_due
            );

            SET v_card = LAST_INSERT_ID();

            -- 2. 지출 분류
            INSERT INTO categories (
                categories_id,
                member_id,
                name,
                color,
                sort_order
            )
            VALUES (
                v_category,
                v_member,
                CONCAT('[더미] 지출 분류 ', v_i),
                '#8054FF',
                v_i
            );

            -- 3. 구독
            INSERT INTO subscription (
                sub_id,
                member_id,
                sub_ctg_id,
                card_id,
                name,
                amount,
                currency,
                billing_cycle,
                cycle_interval,
                start_date,
                billing_day,
                next_billing_date,
                status,
                notify_enabled,
                notify_days_before,
                memo
            )
            VALUES (
                v_sub,
                v_member,
                v_sub_category,
                v_card,
                v_name,
                v_amount,
                'KRW',
                'MONTHLY',
                1,
                v_start,
                DAY(v_due),
                v_due,
                'ACTIVE',
                1,
                3,
                '[더미:v2] 웹 연동 확인용'
            );

            -- 4. 지출
            INSERT INTO expense (
                member_id,
                expense_method_id,
                card_id,
                categories_id,
                amount,
                description,
                expense_date
            )
            VALUES (
                v_member,
                v_method,
                v_card,
                v_category,
                v_amount,
                CONCAT(v_name, ' 지출'),
                v_paid
            );

            -- 5. 실제 청구 기록
            INSERT INTO payment (
                sub_id,
                member_id,
                billed_on,
                amount,
                currency,
                source
            )
            VALUES (
                v_sub,
                v_member,
                v_paid,
                v_amount,
                'KRW',
                'AUTO'
            );

            -- 6. 일정
            INSERT INTO schedule (
                member_id,
                title,
                amount,
                category,
                payment_date,
                description,
                repeat_type,
                payment_status
            )
            VALUES (
                v_member,
                CONCAT(v_name, ' 결제 예정'),
                v_amount,
                '구독',
                TIMESTAMP(v_due, '09:00:00'),
                '[더미:v1] 캘린더 표시 확인용',
                'NONE',
                'PENDING'
            );

            -- 7. 게시글
            INSERT INTO post (
                member_id,
                title,
                content
            )
            VALUES (
                v_member,
                CONCAT('[더미] 절약 이야기 ', v_i),
                CONCAT(
                    '화면 확인용 테스트 게시글 ',
                    v_i,
                    '입니다.'
                )
            );

            SET v_post = LAST_INSERT_ID();

            -- 8. 댓글
            INSERT INTO `comment` (
                post_id,
                content
            )
            VALUES (
                v_post,
                CONCAT('[더미] 테스트 댓글 ', v_i)
            );

            -- 9. 절약 추천
            INSERT INTO recommendation (
                rec_id,
                sub_id,
                member_id,
                title,
                saving_amount,
                status
            )
            VALUES (
                v_rec,
                v_sub,
                v_member,
                CONCAT(v_name, ' 이용 여부 검토'),
                v_amount,
                'NEW'
            );

            SET v_created = v_created + 1;

        END IF;

        -- 10. 사용량 점검
        -- 8개 점검 예시 + 2개 미점검.
        -- 이미 존재하는 점검 결과는 변경하지 않습니다.
        IF v_i <= 8 THEN

            INSERT INTO usage_check (
                sub_id,
                member_id,
                usage_level,
                checked_on
            )
            SELECT
                v_sub,
                v_member,
                CASE
                    WHEN v_i = 6 THEN 'NEVER'
                    WHEN v_i IN (2, 7) THEN 'RARELY'
                    WHEN v_i IN (3, 5) THEN 'SOMETIMES'
                    ELSE 'OFTEN'
                END,
                CURRENT_DATE()
            WHERE NOT EXISTS (
                SELECT 1
                FROM usage_check
                WHERE sub_id = v_sub
            );

            SET v_usage_created =
                v_usage_created + ROW_COUNT();

        END IF;

        SET v_i = v_i + 1;

    END WHILE;

    COMMIT;

    SELECT
        'mbheum654' AS target_account,
        v_created AS created_sets,
        10 - v_created AS refreshed_sets,
        v_usage_created AS created_usage_checks;

END$$

DELIMITER ;

CALL seed_routineslim_demo();

DROP PROCEDURE seed_routineslim_demo;

-- =========================================================
-- 구독 및 사용량 결과 확인
-- =========================================================

SELECT
    m.member_name,
    BIN_TO_UUID(m.member_id) AS member_uuid,
    s.name,
    c.category_name,
    s.amount,
    s.start_date,
    s.billing_day,
    s.next_billing_date,
    s.status,
    u.usage_level,
    u.checked_on
FROM subscription s
JOIN member m
    ON m.member_id = s.member_id
JOIN subscription_category c
    ON c.sub_ctg_id = s.sub_ctg_id
LEFT JOIN usage_check u
    ON u.sub_id = s.sub_id
WHERE m.member_name = 'mbheum654'
ORDER BY s.next_billing_date, s.name;

-- 프론트 카테고리 매핑 확인
SELECT
    sub_ctg_id,
    category_name
FROM subscription_category
WHERE category_name IN (
    'OTT',
    '음악',
    '클라우드',
    '쇼핑'
)
ORDER BY sub_ctg_id;