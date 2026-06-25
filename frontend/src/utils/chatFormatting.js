export function wrapSelection(text, start, end, prefix, suffix = prefix) {
  const selected = text.slice(start, end) || "text";
  const wrapped = `${prefix}${selected}${suffix}`;
  return {
    newValue: text.slice(0, start) + wrapped + text.slice(end),
    newPos: start + prefix.length + selected.length + suffix.length,
  };
}

export function insertAtCursor(text, start, end, insert) {
  return {
    newValue: text.slice(0, start) + insert + text.slice(end),
    newPos: start + insert.length,
  };
}

const EMOJI_LIST = [
  "😀", "😂", "😊", "👍", "🙏", "🎉", "🔥", "❤️", "👏", "✅",
  "❌", "⚠️", "💡", "📎", "📌", "🚀", "💬", "🤝", "👀", "😅",
];

export const CHAT_EMOJIS = EMOJI_LIST;

const GIPHY_SAMPLES = [
  { title: "Thumbs Up", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
  { title: "Great Job", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
  { title: "Thank You", url: "https://media.giphy.com/media/3o7TKoWXm3okqNgQbu/giphy.gif" },
  { title: "Let's Go", url: "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif" },
];

export const GIPHY_PRESETS = GIPHY_SAMPLES;

export function parseRichText(text) {
  if (!text) return [];

  const tokens = [];
  let remaining = text;

  const patterns = [
    { regex: /```([\s\S]*?)```/, type: "code" },
    { regex: /\*\*([^*]+)\*\*/, type: "bold" },
    { regex: /\*([^*]+)\*/, type: "italic" },
    { regex: /__([^_]+)__/, type: "underline" },
    { regex: /~~([^~]+)~~/, type: "strike" },
    { regex: /(https?:\/\/[^\s]+)/, type: "link" },
  ];

  while (remaining.length > 0) {
    let earliest = null;
    let earliestIndex = remaining.length;

    patterns.forEach(({ regex, type }) => {
      const match = remaining.match(regex);
      if (match && match.index < earliestIndex) {
        earliestIndex = match.index;
        earliest = { match, type };
      }
    });

    if (!earliest || earliestIndex > 0) {
      const plain = earliest ? remaining.slice(0, earliestIndex) : remaining;
      if (plain) tokens.push({ type: "text", value: plain });
      if (!earliest) break;
      remaining = remaining.slice(earliestIndex);
    }

    if (earliest) {
      const { match, type } = earliest;
      if (type === "code") tokens.push({ type, value: match[1] });
      else if (type === "link") tokens.push({ type, value: match[1] });
      else tokens.push({ type, value: match[1] });
      remaining = remaining.slice(match[0].length);
    }
  }

  return tokens.length ? tokens : [{ type: "text", value: text }];
}
