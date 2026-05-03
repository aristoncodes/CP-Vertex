import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import Link from "next/link"

export default async function ArticlePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params
  const fullSlug = resolvedParams.slug.join("/")
  
  const article = await prisma.algorithmArticle.findUnique({
    where: { slug: fullSlug },
    include: { problems: true }
  })

  if (!article) return notFound()

  // ── Content pre-processing ──
  let cleanContent = article.content

  // 1. Strip YAML-style frontmatter (---\n...\n---) that some articles have
  cleanContent = cleanContent.replace(/^---[\s\S]*?---\s*/m, '')

  // 2. Strip loose "title:" / "tags:" lines at the very top (CP-Algorithms metadata leak)
  cleanContent = cleanContent.replace(/^title:\s*.*\n?/im, '')
  cleanContent = cleanContent.replace(/^tags:\s*.*\n?/im, '')
  cleanContent = cleanContent.replace(/^e_maxx_link:\s*.*\n?/im, '')

  // 3. (Removed) We now keep the Practice Problems section as requested by the user.

  // 4. Convert LaTeX/TeX fenced code blocks into KaTeX display math
  cleanContent = cleanContent.replace(
    /^[ \t]*```(?:latex|tex|math)?\s*\n([\s\S]*?)```/gim,
    (_match, content) => {
      const latexIndicators = /\\(?:frac|sum|int|prod|lim|sqrt|binom|text|operatorname|begin|end|left|right|cdot|ldots|ddots|leq|geq|neq|approx|equiv|pmod|mod|log|ln|sin|cos|tan|max|min|gcd|lcm|forall|exists|infty|partial|nabla|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|sigma|phi|psi|omega|pi|cap|cup|subseteq|supseteq|subset|in|notin|emptyset|mathbb|mathrm|mathcal|mathbf|overline|underline|overbrace|underbrace|hat|tilde|vec|dot|bar|widetilde|widehat|boldsymbol)/
      const hasLatex = latexIndicators.test(content)
      const hasCodeSyntax = /(?:^|\n)\s*(?:for\s*\(|while\s*\(|if\s*\(|int\s+|void\s+|#include|import\s+|def\s+|class\s+|return\s+|cout\s*<<|cin\s*>>|printf|scanf|print\s*\(|struct\s+|enum\s+|auto\s+|const\s+\w+\s+\w+|std::|vector<|map<|set<|using\s+namespace)/.test(content)
      
      // If it has latex/tex/math tag, or looks like LaTeX and NOT like code, render as math
      const isTaggedMath = _match.toLowerCase().includes('latex') || _match.toLowerCase().includes('tex') || _match.toLowerCase().includes('math')
      if (isTaggedMath || (hasLatex && !hasCodeSyntax)) {
        return `\n$$\n${content.trim()}\n$$\n`
      }
      return _match
    }
  )

  // 5. Strip indentation from $$ delimiters to prevent them from becoming indented code blocks
  cleanContent = cleanContent.replace(/^[ \t]+\$\$/gm, '$$')

  // 6. Strip backticks around inline math (e.g., `$O(n)$`) so they aren't parsed as inline code
  cleanContent = cleanContent.replace(/`(\$[^$\n]+\$)`/g, '$1')

  // 7. Fix $$ math blocks — ensure they are on their own lines
  cleanContent = cleanContent.replace(/\$\$/g, '\n$$\n')

  // 7. Wrap naked LaTeX environments for KaTeX
  cleanContent = cleanContent
    .replace(/\\begin{align\*?}/g, '$$\n\\begin{aligned}')
    .replace(/\\end{align\*?}/g, '\n\\end{aligned}\n$$')
    .replace(/\\begin{eqnarray\*?}/g, '$$\n\\begin{aligned}')
    .replace(/\\end{eqnarray\*?}/g, '\n\\end{aligned}\n$$')
    .replace(/\\begin{gather\*?}/g, '$$\n\\begin{gathered}')
    .replace(/\\end{gather\*?}/g, '\n\\end{gathered}\n$$')
    .replace(/\\begin{equation\*?}/g, '$$\n')
    .replace(/\\end{equation\*?}/g, '\n$$')
    .replace(/\\begin{cases}/g, '\\begin{cases}')
    .replace(/\\end{cases}/g, '\\end{cases}')
    .replace(/\$\$\s*\$\$/g, '$$')

  // 8. Strip CP-Algorithms {.cpp} / {.python} class annotations from fenced code blocks
  cleanContent = cleanContent.replace(/```\s*\{\.(\w+)\}/g, '```$1')

  // 9. Strip any remaining bullet lists that are just "- Original" or "- [link]" at the top
  cleanContent = cleanContent.replace(/^\s*-\s*\[?Original\]?.*\n?/im, '')

  // 10. Strip the leading H1 (# Title) since we render article.title separately above
  cleanContent = cleanContent.replace(/^\s*#\s+.+\n?/, '')

  const wordCount = cleanContent.split(/\s+/).length
  const readTime = Math.max(1, Math.round(wordCount / 200))

  return (
    <>
      {/* Google Fonts & Material Symbols */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <div style={{
        fontFamily: "'Inter', sans-serif",
        background: "#f7fafe",
        color: "#181c1f",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* ─── Top Navigation Bar ─── */}
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(194,198,214,0.25)",
        }}>
          <div style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link href="/learn" style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                textDecoration: "none",
                color: "#0366D6",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
              </Link>
              <Link href="/learn" style={{
                textDecoration: "none",
                color: "#181c1f",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ color: "#0366D6", fontSize: 24 }}>menu_book</span>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>Intel Database</span>
              </Link>
            </div>
            <Link href="/learn" style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0366d6",
              textDecoration: "none",
            }}>
              ← Back to Library
            </Link>
          </div>
        </header>

        {/* ─── Content Layout ─── */}
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 32px 80px",
          width: "100%",
          display: "flex",
          gap: 48,
          alignItems: "flex-start",
        }}>

          {/* ── Main Article Column ── */}
          <main style={{
            flex: 1,
            minWidth: 0,
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid rgba(194,198,214,0.3)",
            padding: "48px 56px",
          }}>

            {/* Breadcrumbs */}
            <nav style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              color: "#727785",
              marginBottom: 32,
            }}>
              <Link href="/learn" style={{ color: "#0366d6", textDecoration: "none" }}>Intel Database</Link>
              <span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.4 }}>chevron_right</span>
              <span>{article.category}</span>
              <span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.4 }}>chevron_right</span>
              <span>{article.subcategory}</span>
            </nav>

            {/* Article Title */}
            <h1 style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "#181c1f",
              margin: "0 0 12px 0",
            }}>
              {article.title}
            </h1>

            {/* Tags (inline under title) */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 40,
            }}>
              {article.tags.map(tag => (
                <span key={tag} style={{
                  background: "#eef1f5",
                  color: "#405681",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}>
                  #{tag}
                </span>
              ))}
              <span style={{
                background: "rgba(3,102,214,0.08)",
                color: "#004fa8",
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
              }}>
                Difficulty {article.difficulty}
              </span>
              <span style={{
                background: "#f1f4f8",
                color: "#727785",
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
              }}>
                {readTime} min read
              </span>
            </div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: "rgba(194,198,214,0.35)",
              marginBottom: 40,
            }} />

            {/* ── Markdown Body ── */}
            <article style={{
              fontSize: 17,
              lineHeight: 1.75,
              color: "#2d3134",
              fontWeight: 400,
            }}>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                components={{
                  h1: ({node, ...props}) => (
                    <h1 style={{
                      fontSize: 32, fontWeight: 800, color: "#181c1f",
                      marginTop: 48, marginBottom: 20, letterSpacing: "-0.02em", lineHeight: 1.2,
                    }} {...props} />
                  ),
                  h2: ({node, ...props}) => (
                    <h2 style={{
                      fontSize: 26, fontWeight: 700, color: "#181c1f",
                      marginTop: 48, marginBottom: 20, paddingBottom: 10,
                      borderBottom: "1px solid rgba(194,198,214,0.35)", letterSpacing: "-0.02em",
                      lineHeight: 1.25,
                    }} {...props} />
                  ),
                  h3: ({node, ...props}) => (
                    <h3 style={{
                      fontSize: 21, fontWeight: 700, color: "#181c1f",
                      marginTop: 36, marginBottom: 16, letterSpacing: "-0.01em",
                      lineHeight: 1.3,
                    }} {...props} />
                  ),
                  h4: ({node, ...props}) => (
                    <h4 style={{
                      fontSize: 18, fontWeight: 700, color: "#181c1f",
                      marginTop: 28, marginBottom: 12,
                    }} {...props} />
                  ),
                  p: ({node, ...props}) => (
                    <p style={{ marginTop: 0, marginBottom: 20, color: "#424753" }} {...props} />
                  ),
                  ul: ({node, ...props}) => (
                    <ul style={{ marginBottom: 20, paddingLeft: 24, listStyleType: "disc", color: "#424753" }} {...props} />
                  ),
                  ol: ({node, ...props}) => (
                    <ol style={{ marginBottom: 20, paddingLeft: 24, listStyleType: "decimal", color: "#424753" }} {...props} />
                  ),
                  li: ({node, ...props}) => (
                    <li style={{ marginBottom: 8, lineHeight: 1.7 }} {...props} />
                  ),
                  blockquote: ({node, ...props}) => (
                    <blockquote style={{
                      borderLeft: "4px solid #0366d6",
                      background: "#f1f4f8",
                      padding: "16px 20px",
                      margin: "24px 0",
                      color: "#2d3134",
                      fontStyle: "italic",
                      borderRadius: "0 10px 10px 0",
                    }} {...props} />
                  ),
                  code: ({node, inline, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || '')
                    const lang = match ? match[1].toLowerCase() : ''

                    // Real programming languages that should get the code-block UI
                    const codeLanguages = new Set([
                      'cpp', 'c', 'cc', 'cxx', 'c++',
                      'python', 'py', 'python3',
                      'java', 'kotlin', 'scala',
                      'javascript', 'js', 'typescript', 'ts',
                      'go', 'rust', 'rs', 'ruby', 'rb',
                      'pascal', 'delphi', 'haskell', 'hs',
                      'bash', 'sh', 'shell', 'zsh',
                      'sql', 'r', 'perl', 'lua', 'swift',
                      'csharp', 'cs', 'php', 'dart',
                      'nasm', 'asm', 'assembly',
                      'pseudocode', 'pseudo',
                    ])

                    const isRealCode = lang && codeLanguages.has(lang)

                    // Display name mapping for common languages
                    const langLabels: Record<string, string> = {
                      'cpp': 'C++', 'cc': 'C++', 'cxx': 'C++', 'c++': 'C++',
                      'c': 'C', 'python': 'Python', 'py': 'Python', 'python3': 'Python',
                      'java': 'Java', 'kotlin': 'Kotlin', 'javascript': 'JavaScript',
                      'js': 'JavaScript', 'typescript': 'TypeScript', 'ts': 'TypeScript',
                      'go': 'Go', 'rust': 'Rust', 'rs': 'Rust', 'ruby': 'Ruby',
                      'bash': 'Bash', 'sh': 'Shell', 'shell': 'Shell',
                      'sql': 'SQL', 'haskell': 'Haskell', 'pascal': 'Pascal',
                      'csharp': 'C#', 'cs': 'C#', 'php': 'PHP', 'swift': 'Swift',
                      'pseudocode': 'Pseudocode', 'pseudo': 'Pseudocode',
                    }

                    if (inline) {
                      return (
                        <code style={{
                          background: "#f1f4f8",
                          padding: "2px 7px",
                          borderRadius: 5,
                          fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                          fontSize: "0.85em",
                          color: "#004fa8",
                          border: "1px solid rgba(194,198,214,0.3)",
                        }} {...props}>
                          {children}
                        </code>
                      )
                    }

                    if (isRealCode) {
                      // Real code block with language header
                      return (
                        <div style={{
                          margin: "28px 0",
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid rgba(194,198,214,0.4)",
                        }}>
                          <div style={{
                            background: "#ebeef2",
                            padding: "8px 16px",
                            borderBottom: "1px solid rgba(194,198,214,0.4)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#727785",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontFamily: "'SF Mono', monospace",
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>code</span>
                            {langLabels[lang] || lang}
                          </div>
                          <pre style={{
                            background: "#fafcfe",
                            padding: "20px 24px",
                            overflowX: "auto",
                            margin: 0,
                          }}>
                            <code style={{
                              fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                              fontSize: 14,
                              color: "#181c1f",
                              lineHeight: 1.6,
                            }} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      )
                    }

                    // Non-code block (unlabeled or non-programming language)
                    // Render as a simple pre block without the "CODE" header
                    return (
                      <pre style={{
                        background: "#f7f9fb",
                        padding: "20px 24px",
                        borderRadius: 10,
                        border: "1px solid rgba(194,198,214,0.25)",
                        overflowX: "auto",
                        margin: "24px 0",
                      }}>
                        <code style={{
                          fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
                          fontSize: 14,
                          color: "#2d3134",
                          lineHeight: 1.6,
                        }} {...props}>
                          {children}
                        </code>
                      </pre>
                    )
                  },
                  a: ({node, ...props}) => (
                    <a style={{
                      color: "#0366d6",
                      textDecoration: "none",
                      borderBottom: "1px solid rgba(3,102,214,0.3)",
                    }} {...props} />
                  ),
                  table: ({node, ...props}) => (
                    <div style={{ overflowX: "auto", margin: "28px 0" }}>
                      <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 15,
                      }} {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => (
                    <th style={{
                      borderBottom: "2px solid #c2c6d6",
                      padding: "10px 14px",
                      textAlign: "left",
                      color: "#181c1f",
                      fontWeight: 700,
                      fontSize: 13,
                    }} {...props} />
                  ),
                  td: ({node, ...props}) => (
                    <td style={{
                      borderBottom: "1px solid rgba(194,198,214,0.4)",
                      padding: "10px 14px",
                      color: "#424753",
                    }} {...props} />
                  ),
                  hr: ({node, ...props}) => (
                    <hr style={{
                      border: "none",
                      height: 1,
                      background: "rgba(194,198,214,0.35)",
                      margin: "40px 0",
                    }} {...props} />
                  ),
                  img: ({node, ...props}) => (
                    <img style={{
                      maxWidth: "100%",
                      borderRadius: 12,
                      margin: "24px 0",
                    }} {...props} />
                  ),
                }}
              >
                {cleanContent}
              </ReactMarkdown>
            </article>
          </main>

          {/* ── Sidebar ── */}
          <aside style={{
            width: 280,
            flexShrink: 0,
            position: "sticky",
            top: 80,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}>

            {/* Metadata Card */}
            <div style={{
              background: "#ffffff",
              borderRadius: 16,
              border: "1px solid rgba(194,198,214,0.3)",
              padding: "24px 20px",
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#727785",
                marginBottom: 16,
              }}>
                Article Metadata
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "rgba(3,102,214,0.06)",
                  borderRadius: 10,
                  color: "#0366d6",
                  fontSize: 14,
                  fontWeight: 600,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>signal_cellular_alt</span>
                  Difficulty: {article.difficulty}
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "#f1f4f8",
                  borderRadius: 10,
                  color: "#424753",
                  fontSize: 14,
                  fontWeight: 500,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>schedule</span>
                  {readTime} min read
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "#f1f4f8",
                  borderRadius: 10,
                  color: "#424753",
                  fontSize: 14,
                  fontWeight: 500,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>folder_open</span>
                  {article.category}
                </div>
              </div>
            </div>

            {/* Practice Targets */}
            {article.problems.length > 0 && (
              <div style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid rgba(194,198,214,0.3)",
                padding: "24px 20px",
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "#727785",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>target</span>
                  Practice Targets
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {article.problems.map((prob) => (
                    <a
                      key={prob.id}
                      href={prob.link}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "#f7fafe",
                        border: "1px solid rgba(194,198,214,0.25)",
                        textDecoration: "none",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <div>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#181c1f",
                          lineHeight: 1.3,
                          marginBottom: 2,
                        }}>
                          {prob.name}
                        </div>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#727785",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}>
                          {prob.platform}{prob.rating ? ` · ${prob.rating}` : ''}
                        </div>
                      </div>
                      <span className="material-symbols-outlined" style={{
                        fontSize: 16,
                        color: "#c2c6d6",
                        flexShrink: 0,
                        marginLeft: 8,
                      }}>open_in_new</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
