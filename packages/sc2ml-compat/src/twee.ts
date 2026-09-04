/**
 * A single passage parsed from a `.twee` file.
 *
 * @see https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader/blob/master/src/BeforeSC2/ModZipReader.ts
 */
export type Twee2PassageR = {
  name: string,
  tags: string[],
  content: string,
};

/**
 * Line-based twee parser. More tolerant than {@link Twee2Passage} (handles stray `[`/`]`).
 */
export const Twee2Passage2 = (s: string): Twee2PassageR[] => {
  const tweeList: Twee2PassageR[] = [];
  const lines = s.split(/\r?\n/);
  let lastTwee: Twee2PassageR | undefined = undefined;
  let lastStartLine = -1;

  for (let i = 0; i < lines.length; ++i) {
    const l = lines[i];
    if (!l.startsWith(':: ')) continue;

    const r = l.split('[');
    const name = r[0].slice(':: '.length).trim();
    let tags: string[] = [];
    if (r.length >= 2) {
      if (!r[1].includes(']')) continue; // malformed header, skip
      tags = r[1].split(']')[0].split(' ').map(T => T.trim());
    }

    if (lastTwee) {
      lastTwee.content = lines.slice(lastStartLine + 1, i + 1).join('\n');
      tweeList.push(lastTwee);
    }
    lastTwee = { name, tags, content: '' };
    lastStartLine = i;
  }

  if (lastTwee) {
    lastTwee.content = lines.slice(lastStartLine + 1).join('\n');
    tweeList.push(lastTwee);
  }
  return tweeList;
};

/**
 * Regex-based twee parser, faithful port of the original SC2ML implementation.
 */
const TweeHeaderReg = /^(:: +((?:[^:"\/\n\r\[\] ]+ *)+)(?: *\[((?:[^ \]]+ *)* *)\] *|))$/gm;

export const Twee2Passage = (s: string): Twee2PassageR[] => {
  const r = s.split(TweeHeaderReg);
  const rr: Twee2PassageR[] = [];
  for (let i = 0; i < r.length; i++) {
    if (!r[i].startsWith(':: ')) continue;
    rr.push({
      name: r[++i].trim(),
      tags: r[++i]?.split(' ') || [],
      content: r[++i],
    });
  }
  return rr;
};
