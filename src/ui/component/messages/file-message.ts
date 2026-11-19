import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { formatFileSize } from '../../../helper';
import { getFileTypeIconByName } from '../../../assets';
import { ChatUIMessageModel } from '@lib/models/NCUIMessageModel';
import { FileMessageContent } from '@nexconn/chat';

const FILE_NAME_TAIL_MAX_LENGTH = 12;
const FILE_NAME_EXTENSION_MAX_LENGTH = 10;
type GraphemeSegment = { segment: string };
type GraphemeSegmenter = { segment: (value: string) => Iterable<GraphemeSegment> };
type GraphemeSegmenterConstructor = new (
  locale?: string,
  options?: { granularity: 'grapheme' },
) => GraphemeSegmenter;

const IntlSegmenter = (Intl as typeof Intl & { Segmenter?: GraphemeSegmenterConstructor }).Segmenter;
const fileNameSegmenter = IntlSegmenter
  ? new IntlSegmenter(undefined, { granularity: 'grapheme' })
  : undefined;

const getFileNameParts = (name: string): { prefix: string; tail: string } => {
  const characters = fileNameSegmenter
    ? Array.from(fileNameSegmenter.segment(name), ({ segment }) => segment)
    : Array.from(name);
  const dotIndex = characters.lastIndexOf('.');
  const extensionLength = characters.length - dotIndex - 1;
  const hasValidExtension = dotIndex > 0
    && extensionLength > 0
    && extensionLength <= FILE_NAME_EXTENSION_MAX_LENGTH;
  const tailStart = hasValidExtension
    ? dotIndex - 1
    : Math.max(0, characters.length - FILE_NAME_TAIL_MAX_LENGTH);

  return {
    prefix: characters.slice(0, tailStart).join(''),
    tail: characters.slice(tailStart).join(''),
  };
};

export class FileMessageElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: max-content;
      min-width: 0;
      max-width: 100%;
    }
    .file-message {
      display: flex;
      align-items: center;
      min-width: 0;
      max-width: 100%;
    }
    .icon {
      position: relative;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    .file-message-icon {
      width: 44px;
      height: 44px;
      display: block;
      object-fit: contain;
    }
    .desc {
      flex: 1 1 auto;
      min-width: 0;
      max-width: 372px;
      box-sizing: border-box;
      font-size: 12px;
      line-height: 18px;
      padding: 0 6px;
    }
    .name {
      display: flex;
      max-width: 360px;
      min-width: 0;
      box-sizing: border-box;
      overflow: hidden;
      white-space: nowrap;
      color: #020814;
    }
    .name-prefix {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .name-tail {
      flex: 0 0 auto;
    }
    @media (max-width: 768px) {
      .desc {
        max-width: 212px;
      }
      .name {
        max-width: 200px;
      }
    }
    .size {
      color: #7C838E;
    }
  `;

  @property({ type: Object })
  declare message: ChatUIMessageModel<FileMessageContent>;

  render() {
    if (!this.message) return html``;
    const content = this.message.content as any;
    const fileName = content.name ?? '';
    const { prefix, tail } = getFileNameParts(fileName);
    return html`
      <div class="file-message">
        <div class="icon">
          <nc-file-transfer-ctrl-provider .message=${this.message}>
            <img class="file-message-icon" src=${getFileTypeIconByName(content.name ?? '')} alt="File Icon">
          </nc-file-transfer-ctrl-provider>
        </div>
        <div class="desc">
          <div class="name" title=${fileName}>
            <span class="name-prefix">${prefix}</span><span class="name-tail">${tail}</span>
          </div>
          <span class="size">${formatFileSize(content.size)}</span>
        </div>
      </div>
    `;
  }
}
