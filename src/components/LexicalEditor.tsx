import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { $getSelection, $isRangeSelection, $insertNodes, FORMAT_TEXT_COMMAND, DecoratorNode, type EditorState, type LexicalEditor as LexicalEditorInstance, type NodeKey } from 'lexical'
import { Box, IconButton, Stack, Tooltip } from '@mui/material'
import { Code, FormatBold, FormatItalic, Image as ImageIcon } from '@mui/icons-material'
import type { JSX } from 'react'

export type LexicalEditorProps = {
  content?: string | Record<string, unknown>
  onChange?: (value: Record<string, unknown>) => void
  editable?: boolean
}

function normalizeLexicalContent(input?: string | Record<string, unknown>): Record<string, unknown> {
  const emptyDocument = () => ({
    root: {
      children: [
        {
          children: [{ text: 'Start writing here...', type: 'text' }],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })

  if (!input) return emptyDocument()

  if (typeof input === 'string') {
    return {
      root: {
        children: [
          {
            children: [{ text: input, type: 'text' }],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }
  }

  const root = input.root
  const rootChildren = root && typeof root === 'object' ? (root as { children?: unknown }).children : undefined
  if (!Array.isArray(rootChildren) || rootChildren.length === 0) {
    return emptyDocument()
  }

  return input
}

type SerializedImageNode = { type: 'image'; version: 1; src: string; altText: string }

class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string
  __altText: string

  static getType() { return 'image' }
  static clone(node: ImageNode) { return new ImageNode(node.__src, node.__altText, node.__key) }
  static importJSON(serializedNode: SerializedImageNode) { return new ImageNode(serializedNode.src, serializedNode.altText) }

  constructor(src: string, altText = '', key?: NodeKey) {
    super(key)
    this.__src = src
    this.__altText = altText
  }

  exportJSON(): SerializedImageNode { return { type: 'image', version: 1, src: this.__src, altText: this.__altText } }
  createDOM() { const element = document.createElement('span'); element.className = 'lexical-image'; return element }
  updateDOM() { return false }
  decorate() { return <img src={this.__src} alt={this.__altText} style={{ maxWidth: '100%', display: 'block' }} /> }
}

function $createImageNode(src: string, altText: string) { return new ImageNode(src, altText) }
function $insertImage(editor: LexicalEditorInstance, src: string, altText: string) {
  editor.update(() => {
    if ($isRangeSelection($getSelection())) $insertNodes([$createImageNode(src, altText)])
  })
}

function EditorToolbar({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext()
  return (
    <Stack direction="row" spacing={0.5} sx={{ mb: 1, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
      <Tooltip title="Bold"><IconButton size="small" disabled={!editable} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}><FormatBold fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Italic"><IconButton size="small" disabled={!editable} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}><FormatItalic fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Code"><IconButton size="small" disabled={!editable} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}><Code fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Insert image"><IconButton size="small" disabled={!editable} onClick={() => document.getElementById('lexical-image-input')?.click()}><ImageIcon fontSize="small" /></IconButton></Tooltip>
      <input id="lexical-image-input" type="file" accept="image/*" hidden onChange={(event) => {
        const file = event.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => { if (typeof reader.result === 'string') $insertImage(editor, reader.result, file.name) }
        reader.readAsDataURL(file)
        event.target.value = ''
      }} />
    </Stack>
  )
}

function ImagePastePlugin({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext()
  return <ContentEditable style={{ outline: 'none', minHeight: 180, padding: '16px', fontSize: '16px', lineHeight: '1.5' }} onPaste={(event) => {
    if (!editable) return
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'))
    if (!image) return
    event.preventDefault()
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') $insertImage(editor, reader.result, image.name) }
    reader.readAsDataURL(image)
  }} />
}

export function LexicalEditor({ content, onChange, editable = true }: LexicalEditorProps) {
  const config = {
    namespace: 'LexicalArticleEditor',
    theme: {
      ltr: 'ltr',
      rtl: 'rtl',
      paragraph: 'lexical-paragraph',
    },
    onError: (error: Error) => {
      console.error('Lexical error:', error)
    },
    editorState: JSON.stringify(normalizeLexicalContent(content)),
    nodes: [ImageNode],
    editable,
  }

  const handleChange = (editorState: EditorState) => {
    editorState.read(() => {
      const json = editorState.toJSON()
      onChange?.(json as unknown as Record<string, unknown>)
    })
  }

  return (
    <LexicalComposer initialConfig={config}>
      <EditorToolbar editable={editable} />
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          minHeight: 220,
          backgroundColor: editable ? '#fff' : '#f5f5f5',
        }}
      >
        <RichTextPlugin
          contentEditable={
            <ImagePastePlugin editable={editable} />
          }
          placeholder={
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                fontSize: '16px',
                color: '#999',
                pointerEvents: 'none',
              }}
            >
              Start writing here...
            </div>
          }
          ErrorBoundary={() => <div>Error in editor</div>}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
      </Box>
    </LexicalComposer>
  )
}
