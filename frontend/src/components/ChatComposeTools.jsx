import { useRef, useState } from "react";
import {
  BarChart3,
  Bold,
  Code,
  FileText,
  HardDrive,
  Italic,
  Link2,
  Paperclip,
  Plus,
  Smile,
  Strikethrough,
  Type,
  Underline,
  X,
} from "lucide-react";
import Modal from "./Modal";
import { CHAT_EMOJIS, GIPHY_PRESETS, insertAtCursor, wrapSelection } from "../utils/chatFormatting";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ChatComposeTools({
  draft,
  setDraft,
  composeRef,
  onDraftChange,
  onKeyDown,
  mentionPicker,
  placeholder,
  disabled,
  attachments,
  onAttachmentsChange,
  attachmentLoading = false,
  onAttachmentLoadingChange,
  onInsertPoll,
  onInsertGif,
  onInsertDriveLink,
}) {
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showGiphyModal, setShowGiphyModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [pollForm, setPollForm] = useState({ question: "", options: ["", ""] });
  const [noteForm, setNoteForm] = useState({ title: "", body: "" });
  const [giphyUrl, setGiphyUrl] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [attachError, setAttachError] = useState("");
  const fileInputRef = useRef(null);

  function applyFormat(prefix, suffix) {
    const el = composeRef.current;
    if (!el) return;
    const { newValue, newPos } = wrapSelection(draft, el.selectionStart, el.selectionEnd, prefix, suffix);
    setDraft(newValue);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newPos, newPos);
    });
  }

  function insertText(insert) {
    const el = composeRef.current;
    if (!el) return;
    const { newValue, newPos } = insertAtCursor(draft, el.selectionStart, el.selectionEnd, insert);
    setDraft(newValue);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newPos, newPos);
    });
  }

  function insertLink() {
    const url = window.prompt("Enter link URL");
    if (!url) return;
    const label = window.prompt("Link text (optional)", url) || url;
    insertText(`[${label}](${url})`);
  }

  function insertEmoji(emoji) {
    insertText(emoji);
    setShowEmoji(false);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(files) {
    if (!files?.length) return;
    setAttachError("");
    onAttachmentLoadingChange?.(true);
    try {
      const loaded = [];
      const rejected = [];
      for (const file of [...files]) {
        if (file.size > MAX_FILE_SIZE) {
          rejected.push(file.name);
          continue;
        }
        const dataUrl = await readFileAsDataUrl(file);
        loaded.push({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl,
        });
      }
      if (rejected.length > 0) {
        setAttachError(
          `${rejected.join(", ")} too large (max ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB per file)`
        );
      }
      if (loaded.length > 0) {
        onAttachmentsChange((prev) => [...prev, ...loaded]);
      }
    } catch (err) {
      setAttachError(err.message || "Failed to attach file");
    } finally {
      onAttachmentLoadingChange?.(false);
    }
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      handleFiles(files);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  }

  function submitPoll(e) {
    e.preventDefault();
    const options = pollForm.options.map((o) => o.trim()).filter(Boolean);
    if (!pollForm.question.trim() || options.length < 2) return;
    onInsertPoll({ question: pollForm.question.trim(), options });
    setPollForm({ question: "", options: ["", ""] });
    setShowPollModal(false);
    setShowPlusMenu(false);
  }

  function submitNote(e) {
    e.preventDefault();
    if (!noteForm.title.trim() || !noteForm.body.trim()) return;
    insertText(`📋 **${noteForm.title.trim()}**\n${noteForm.body.trim()}`);
    setNoteForm({ title: "", body: "" });
    setShowNoteModal(false);
    setShowPlusMenu(false);
  }

  function submitGiphy(e) {
    e.preventDefault();
    const url = giphyUrl.trim();
    if (!url) return;
    onInsertGif(url);
    setGiphyUrl("");
    setShowGiphyModal(false);
    setShowPlusMenu(false);
  }

  function submitDrive(e) {
    e.preventDefault();
    const url = driveUrl.trim();
    if (!url) return;
    onInsertDriveLink(url);
    setDriveUrl("");
    setShowDriveModal(false);
    setShowPlusMenu(false);
  }

  return (
    <>
      <div
        className="chat-compose-box"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {attachError && <div className="chat-attachment-error">{attachError}</div>}
        {(attachments.length > 0 || attachmentLoading) && (
          <div className="chat-attachment-preview">
            {attachmentLoading && (
              <span className="chat-attachment-chip loading">Preparing attachment…</span>
            )}
            {attachments.map((file, index) => (
              <span key={`${file.name}-${index}`} className="chat-attachment-chip">
                {file.mimeType?.startsWith("image/") ? (
                  <img src={file.dataUrl} alt="" className="chat-attachment-chip-thumb" />
                ) : (
                  <Paperclip size={12} />
                )}
                {file.name}
                <button
                  type="button"
                  onClick={() => onAttachmentsChange((prev) => prev.filter((_, i) => i !== index))}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="chat-compose-input-wrap">
          {mentionPicker}
          <textarea
            ref={composeRef}
            rows={3}
            value={draft}
            onChange={onDraftChange}
            onClick={() => composeRef.current?.focus()}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>

        <div className="chat-compose-footer">
          <div className="chat-compose-footer-left">
            <div className="chat-tool-wrap">
              <button
                type="button"
                className="chat-tool-btn"
                title="More options"
                onClick={() => {
                  setShowPlusMenu((v) => !v);
                  setShowEmoji(false);
                }}
              >
                <Plus size={18} />
              </button>
              {showPlusMenu && (
                <ul className="chat-plus-menu">
                  <li>
                    <button type="button" onClick={() => { setShowPollModal(true); setShowPlusMenu(false); }}>
                      <BarChart3 size={16} /> Poll
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => { setShowGiphyModal(true); setShowPlusMenu(false); }}>
                      <FileText size={16} /> Giphy
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => { setShowDriveModal(true); setShowPlusMenu(false); }}>
                      <HardDrive size={16} /> Google Drive
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => { setShowNoteModal(true); setShowPlusMenu(false); }}>
                      <FileText size={16} /> Notes
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => { insertText("```\ncode here\n```"); setShowPlusMenu(false); }}>
                      <Code size={16} /> Code Snippets
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}>
                      <Paperclip size={16} /> Attach
                    </button>
                  </li>
                </ul>
              )}
            </div>

            <button type="button" className="chat-tool-btn" title="Bold" onClick={() => applyFormat("**")}>
              <Bold size={16} />
            </button>
            <button type="button" className="chat-tool-btn" title="Italic" onClick={() => applyFormat("*")}>
              <Italic size={16} />
            </button>
            <button type="button" className="chat-tool-btn" title="Underline" onClick={() => applyFormat("__")}>
              <Underline size={16} />
            </button>
            <button type="button" className="chat-tool-btn" title="Strikethrough" onClick={() => applyFormat("~~")}>
              <Strikethrough size={16} />
            </button>
            <button type="button" className="chat-tool-btn" title="Insert link" onClick={insertLink}>
              <Link2 size={16} />
            </button>
            <button type="button" className="chat-tool-btn" title="Formatting" onClick={() => insertText("**bold** *italic*")}>
              <Type size={16} />
            </button>
          </div>

          <div className="chat-compose-footer-right">
            <div className="chat-tool-wrap">
              <button
                type="button"
                className="chat-tool-btn"
                title="Emoji"
                onClick={() => {
                  setShowEmoji((v) => !v);
                  setShowPlusMenu(false);
                }}
              >
                <Smile size={18} />
              </button>
              {showEmoji && (
                <div className="chat-emoji-picker">
                  {CHAT_EMOJIS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="chat-tool-btn" title="Attach file" onClick={() => fileInputRef.current?.click()}>
              <Paperclip size={18} />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {showPollModal && (
        <Modal title="Create Poll" onClose={() => setShowPollModal(false)}>
          <form className="crm-form" onSubmit={submitPoll}>
            <label>
              Question
              <input value={pollForm.question} onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })} required />
            </label>
            {pollForm.options.map((opt, i) => (
              <label key={i}>
                Option {i + 1}
                <input
                  value={opt}
                  onChange={(e) => {
                    const options = [...pollForm.options];
                    options[i] = e.target.value;
                    setPollForm({ ...pollForm, options });
                  }}
                  required={i < 2}
                />
              </label>
            ))}
            {pollForm.options.length < 5 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPollForm({ ...pollForm, options: [...pollForm.options, ""] })}
              >
                Add option
              </button>
            )}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowPollModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Post poll</button>
            </div>
          </form>
        </Modal>
      )}

      {showGiphyModal && (
        <Modal title="Share a GIF" onClose={() => setShowGiphyModal(false)}>
          <form className="crm-form" onSubmit={submitGiphy}>
            <label>
              GIF URL
              <input value={giphyUrl} onChange={(e) => setGiphyUrl(e.target.value)} placeholder="Paste Giphy URL" />
            </label>
            <div className="giphy-grid">
              {GIPHY_PRESETS.map((gif) => (
                <button key={gif.url} type="button" className="giphy-thumb" onClick={() => setGiphyUrl(gif.url)}>
                  <img src={gif.url} alt={gif.title} />
                  <span>{gif.title}</span>
                </button>
              ))}
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowGiphyModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Send GIF</button>
            </div>
          </form>
        </Modal>
      )}

      {showDriveModal && (
        <Modal title="Share from Google Drive" onClose={() => setShowDriveModal(false)}>
          <form className="crm-form" onSubmit={submitDrive}>
            <label>
              Google Drive link
              <input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." required />
            </label>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDriveModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Share link</button>
            </div>
          </form>
        </Modal>
      )}

      {showNoteModal && (
        <Modal title="Create Note" onClose={() => setShowNoteModal(false)}>
          <form className="crm-form" onSubmit={submitNote}>
            <label>
              Title
              <input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} required />
            </label>
            <label>
              Note
              <textarea rows={4} value={noteForm.body} onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })} required />
            </label>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowNoteModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Insert note</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
