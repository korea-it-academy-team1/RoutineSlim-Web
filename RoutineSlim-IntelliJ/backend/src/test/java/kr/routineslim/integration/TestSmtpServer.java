package kr.routineslim.integration;

import jakarta.mail.*;
import jakarta.mail.internet.MimeMessage;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

final class TestSmtpServer {
  record Mail(String recipient, String code) {}

  final ServerSocket server;
  final Map<String, BlockingQueue<Mail>> mailboxes = new ConcurrentHashMap<>();
  volatile boolean reject = false;

  TestSmtpServer() {
    try {
      server = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
      Thread thread =
          new Thread(
              () -> {
                while (!server.isClosed())
                  try {
                    Socket socket = server.accept();
                    Thread worker = new Thread(() -> handle(socket));
                    worker.setDaemon(true);
                    worker.start();
                  } catch (IOException e) {
                    break;
                  }
              });
      thread.setDaemon(true);
      thread.start();
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  int port() {
    return server.getLocalPort();
  }

  void handle(Socket socket) {
    try (socket;
        var reader =
            new BufferedReader(
                new InputStreamReader(socket.getInputStream(), StandardCharsets.ISO_8859_1));
        var writer =
            new BufferedWriter(
                new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.US_ASCII))) {
      socket.setSoTimeout(10000);
      reply(writer, "220 localhost test SMTP");
      String recipient = "", line;
      while ((line = reader.readLine()) != null) {
        String upper = line.toUpperCase(Locale.ROOT);
        if (upper.startsWith("EHLO") || upper.startsWith("HELO")) reply(writer, "250 localhost");
        else if (upper.startsWith("MAIL FROM")) reply(writer, "250 OK");
        else if (upper.startsWith("RCPT TO")) {
          recipient = line.substring(line.indexOf('<') + 1, line.indexOf('>'));
          reply(writer, "250 OK");
        } else if (upper.equals("DATA")) {
          if (reject) {
            reply(writer, "451 Delivery unavailable");
            continue;
          }
          reply(writer, "354 End with a dot");
          StringBuilder raw = new StringBuilder();
          while ((line = reader.readLine()) != null && !line.equals("."))
            raw.append(line.startsWith("..") ? line.substring(1) : line).append("\r\n");
          var message =
              new MimeMessage(
                  Session.getInstance(new Properties()),
                  new ByteArrayInputStream(raw.toString().getBytes(StandardCharsets.ISO_8859_1)));
          String text = String.valueOf(message.getContent());
          var code = java.util.regex.Pattern.compile("(?<![0-9])([0-9]{6})(?![0-9])").matcher(text);
          if (!code.find()) throw new IllegalStateException("Verification code missing");
          mailboxes
              .computeIfAbsent(recipient, key -> new LinkedBlockingQueue<>())
              .add(new Mail(recipient, code.group(1)));
          reply(writer, "250 Accepted");
        } else if (upper.equals("QUIT")) {
          reply(writer, "221 Bye");
          break;
        } else reply(writer, "250 OK");
      }
    } catch (Exception ignored) {
    }
  }

  static void reply(BufferedWriter writer, String value) throws IOException {
    writer.write(value + "\r\n");
    writer.flush();
  }

  Mail receive(String email) throws InterruptedException {
    return mailboxes
        .computeIfAbsent(email, key -> new LinkedBlockingQueue<>())
        .poll(5, TimeUnit.SECONDS);
  }
}
