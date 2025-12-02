/**
 * Copyright (c) 2015 Jonathan Ong me@jongleberry.com
 * Licensed under the MIT License.
 * Ported/Adapted for TypeScript/Resonote
 */

const properties = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize',
] as const;

export function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) {
      return { top: 0, left: 0, height: 0 };
  }

  const div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);

  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word'; // only for textarea-s
  style.position = 'absolute';
  style.visibility = 'hidden';

  properties.forEach((prop: any) => {
      style[prop] = computed[prop];
  });

  if (isFirefox()) {
      // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
      if (element.scrollHeight > parseInt(computed.height))
          style.overflowY = 'scroll';
  } else {
      style.overflow = 'hidden';
  }

  div.textContent = element.value.substring(0, position);

  const span = document.createElement('span');
  // Wrapping must be replicated *exactly*, including when a long word gets
  // onto the next line, with whitespace at the end of the line before that
  // word.  So  <div...>text<span...>text</span></div>  is incorrect.
  // The logic for wrapping must be the same as the browser's logic.
  // The simplest way to do this is to place the text content into the
  // div, followed by the span.
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
      top: span.offsetTop + parseInt(computed['borderTopWidth']),
      left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
      height: parseInt(computed['lineHeight'])
  };

  document.body.removeChild(div);

  return coordinates;
}

function isFirefox() {
    return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}