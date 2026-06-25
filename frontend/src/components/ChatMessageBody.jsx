import { parseRichText } from "../utils/chatFormatting";

function RichText({ text, mentionNodes }) {
  if (mentionNodes) return <>{mentionNodes}</>;

  const tokens = parseRichText(text);
  return (
    <>
      {tokens.map((token, i) => {
        if (token.type === "bold") return <strong key={i}>{token.value}</strong>;
        if (token.type === "italic") return <em key={i}>{token.value}</em>;
        if (token.type === "underline") return <u key={i}>{token.value}</u>;
        if (token.type === "strike") return <s key={i}>{token.value}</s>;
        if (token.type === "code") {
          return (
            <pre key={i} className="chat-code-block">
              <code>{token.value}</code>
            </pre>
          );
        }
        if (token.type === "link") {
          return (
            <a key={i} href={token.value} target="_blank" rel="noreferrer" className="chat-link">
              {token.value}
            </a>
          );
        }
        const linkMatch = token.value.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
        if (linkMatch) {
          return (
            <a key={i} href={linkMatch[2]} target="_blank" rel="noreferrer" className="chat-link">
              {linkMatch[1]}
            </a>
          );
        }
        return <span key={i}>{token.value}</span>;
      })}
    </>
  );
}

export default function ChatMessageBody({ message, mentionNodes }) {
  const replyQuote = message.replyTo ? (
    <div className="chat-reply-quote">
      <strong>{message.replyTo.userName}</strong>
      <span>{message.replyTo.text}</span>
    </div>
  ) : null;

  const attachmentList =
    message.attachments?.length > 0 ? (
      <div className="chat-message-attachments">
        {message.attachments.map((file, i) =>
          file.mimeType?.startsWith("image/") && file.dataUrl ? (
            <a key={i} href={file.dataUrl} target="_blank" rel="noreferrer" className="chat-attachment-image-link">
              <img src={file.dataUrl} alt={file.name} className="chat-attachment-image" />
            </a>
          ) : (
            <a
              key={i}
              href={file.dataUrl || "#"}
              download={file.name}
              className="chat-attachment-file"
              onClick={!file.dataUrl ? (e) => e.preventDefault() : undefined}
            >
              📎 {file.name || "Attachment"}
            </a>
          )
        )}
      </div>
    ) : null;

  if (message.messageType === "poll" && message.poll) {
    return (
      <div className="chat-poll">
        {replyQuote}
        <strong>📊 {message.poll.question}</strong>
        <ul>
          {message.poll.options.map((opt, i) => (
            <li key={i}>{opt}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (message.messageType === "gif" && message.gifUrl) {
    return (
      <div className="chat-gif-wrap">
        {replyQuote}
        <img src={message.gifUrl} alt="GIF" className="chat-gif" />
        {message.text && <p><RichText text={message.text} /></p>}
        {attachmentList}
      </div>
    );
  }

  if (message.messageType === "drive" && message.driveLink) {
    return (
      <div className="chat-drive-card">
        {replyQuote}
        <span>📁 Google Drive</span>
        <a href={message.driveLink} target="_blank" rel="noreferrer">{message.driveLink}</a>
        {message.text && <p><RichText text={message.text} /></p>}
        {attachmentList}
      </div>
    );
  }

  if (message.messageType === "attachment" || message.attachments?.length > 0) {
    return (
      <div className="chat-message-text">
        {replyQuote}
        {attachmentList}
        {message.text ? (
          <p>{mentionNodes || <RichText text={message.text} />}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="chat-message-text">
      {replyQuote}
      <p>{mentionNodes || <RichText text={message.text} />}</p>
    </div>
  );
}
