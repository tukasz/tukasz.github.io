import { readFileSync, writeFileSync } from 'fs'
import { sync } from 'glob'
import Handlebars from 'handlebars'
import hljs from 'highlight.js'
import marked from 'marked'
import { basename, dirname, join } from 'path'

interface TOCPost {
  date: string
  title: string
  tags: string[]
  href: string
}

const templatePath = join(__dirname, '..', 'templates', 'post.html.template')
const templateSource = readFileSync(templatePath).toString()
const template = Handlebars.compile(templateSource)

function processFile(filePath: string) {
  console.info('Processing file', filePath, ' ...')

  const contents = readFileSync(filePath).toString()
  const baseName = basename(filePath, '.md')
  const [date, title, tags] = baseName.split('__')
  const markedPost = marked(contents, {
    highlight: (code, lang) => {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'

      return hljs.highlight(code, { language }).value
    },
    langPrefix: 'code-block hljs language-',
  })
  const hasCodeSnippets = markedPost.includes('hljs language-')

  const parsedDate = date.replace(/(\d\d\d\d)(\d\d)(\d\d)/, '$1-$2-$3')
  const parsedTitle = title.replace(/_/g, ' ')
  const parsedTags = (tags || '')
    .replace(/\[/g, '|')
    .replace(/\]/g, '|')
    .replace(/\|+/, '|')
    .split('|')
    .filter((tag) => tag.trim() !== '')

  const href = `${date}--${title}--${parsedTags.join('-')}.html`

  const outputPath = join(dirname(filePath), `${href}`)
  const outputContents = template({
    cssStylesHref: '../styles/styles.css',
    postTitle: parsedTitle,
    pageTitle: 'Tukasz Januaz blog',
    hasCodeSnippets,
    date: parsedDate,
    tags: parsedTags,
    body: markedPost,
  })

  console.info('Creating file', outputPath, ' ...')

  writeFileSync(outputPath, outputContents)

  return {
    date: parsedDate,
    title: parsedTitle,
    tags: parsedTags,
    href,
  }
}

const files = sync('posts/**/*.md')

console.info('Found', files.length, 'files')

const posts: TOCPost[] = []

files.forEach((file) => {
  posts.push(processFile(file))
})

const indexTemplatePath = join(__dirname, '..', 'templates', 'index.html.template')
const indexTemplateSource = readFileSync(indexTemplatePath).toString()
const indexTemplate = Handlebars.compile(indexTemplateSource)
const indexOutputPath = join(__dirname, '..', 'index.html')
const indexOutputContents = indexTemplate({
  cssStylesHref: 'styles/styles.css',
  posts,
})

console.info('Updating index.html file ...')

writeFileSync(indexOutputPath, indexOutputContents)
