/**
 * Preprocesses streaming markdown content by closing unclosed tokens.
 * This prevents visual "jumps" where raw markdown syntax (**, `, etc.)
 * suddenly reformats when the closing token arrives.
 *
 * Only modifies content for rendering — the actual stored content is unchanged.
 */
export function preprocessStreamingMarkdown(content, isStreaming) {
    if (!isStreaming || !content) return content;

    // State tracking
    let inFencedCode = false;
    let fencedCodeChar = '';   // '`' or '~'
    let fencedCodeLen = 0;     // 3 or more
    let inInlineCode = false;
    let boldOpen = 0;          // count of unclosed **
    let italicOpen = 0;        // count of unclosed *
    let strikeOpen = 0;        // count of unclosed ~~
    let bracketDepth = 0;      // for [link text]
    let parenAfterBracket = false; // tracking (url) after ]

    let i = 0;
    const len = content.length;

    while (i < len) {
        const ch = content[i];
        const next = i + 1 < len ? content[i + 1] : '';
        const next2 = i + 2 < len ? content[i + 2] : '';

        // Handle escape sequences
        if (ch === '\\' && !inFencedCode && !inInlineCode) {
            i += 2; // skip escaped character
            continue;
        }

        // --- Fenced code blocks (``` or ~~~) ---
        if ((ch === '`' || ch === '~') && next === ch && next2 === ch) {
            // Count the run length
            let runLen = 0;
            const runChar = ch;
            let j = i;
            while (j < len && content[j] === runChar) {
                runLen++;
                j++;
            }
            if (runLen >= 3) {
                if (!inFencedCode && !inInlineCode) {
                    inFencedCode = true;
                    fencedCodeChar = runChar;
                    fencedCodeLen = runLen;
                    i = j;
                    continue;
                } else if (inFencedCode && runChar === fencedCodeChar && runLen >= fencedCodeLen) {
                    inFencedCode = false;
                    i = j;
                    continue;
                }
            }
        }

        // Inside fenced code, skip everything
        if (inFencedCode) {
            i++;
            continue;
        }

        // --- Inline code (`) ---
        if (ch === '`' && !inInlineCode) {
            inInlineCode = true;
            i++;
            continue;
        }
        if (ch === '`' && inInlineCode) {
            inInlineCode = false;
            i++;
            continue;
        }

        // Inside inline code, skip everything
        if (inInlineCode) {
            i++;
            continue;
        }

        // --- Bold/Italic (* and **) ---
        if (ch === '*' && next === '*') {
            // Check for *** (bold+italic)
            if (next2 === '*') {
                // *** — toggle both bold and italic
                boldOpen = boldOpen ? 0 : 1;
                italicOpen = italicOpen ? 0 : 1;
                i += 3;
                continue;
            }
            // ** — toggle bold
            boldOpen = boldOpen ? 0 : 1;
            i += 2;
            continue;
        }
        if (ch === '*' && next !== '*') {
            // Single * — toggle italic
            italicOpen = italicOpen ? 0 : 1;
            i++;
            continue;
        }

        // --- Strikethrough (~~) ---
        if (ch === '~' && next === '~') {
            strikeOpen = strikeOpen ? 0 : 1;
            i += 2;
            continue;
        }

        // --- Links [text](url) ---
        if (ch === '[' && !parenAfterBracket) {
            bracketDepth++;
            i++;
            continue;
        }
        if (ch === ']' && bracketDepth > 0) {
            bracketDepth--;
            if (next === '(') {
                parenAfterBracket = true;
            }
            i++;
            continue;
        }
        if (ch === ')' && parenAfterBracket) {
            parenAfterBracket = false;
            i++;
            continue;
        }

        i++;
    }

    // Build suffix to close unclosed tokens (inner-first)
    let suffix = '';

    // Close inline code first (it swallows everything)
    if (inInlineCode) {
        suffix += '`';
    }

    // Close fenced code block
    if (inFencedCode) {
        suffix += '\n' + fencedCodeChar.repeat(fencedCodeLen);
    }

    // Close strikethrough
    if (strikeOpen) {
        suffix += '~~';
    }

    // Close bold before italic (since bold is ** and italic is *)
    if (boldOpen) {
        suffix += '**';
    }
    if (italicOpen) {
        suffix += '*';
    }

    // For unclosed links, don't try to close — just let them render as text
    // This avoids creating broken link syntax

    return suffix ? content + suffix : content;
}
