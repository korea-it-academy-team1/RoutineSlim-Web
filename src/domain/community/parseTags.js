export const parsePostTags = (value) =>
  value
    .split(",")
    .map((x) => x.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 10);
