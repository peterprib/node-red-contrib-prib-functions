const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_xling="http://www.w3.org/1999/xlink";

 
const fontsizeToHeight = (size) => size * 1.2; // Approximate conversion from font size to height
const fontsizeToWidth = (size) => size * 0.6; // Approximate conversion from font size to width per character
const textWidth = (text, fontSize) => text.length * fontSize * 0.6; // Approximate width based on character count and font size
const defaults= {
  fontSize: 14,
  fontFamily: "Arial, sans-serif",
  padding: 10,
  spacing: 10,
  height: 30,
  lineHeight: 30,
  terminalColor: "#7ec3ebff",
  terminalStroke: "#007acc",
  nonTerminalColor: "#fff0e9",
  nonTerminalStroke: "#ff6600",
  pathStroke: "#333",
  pathFill: "none"
};
defaults.spacingBothSizes=defaults.spacing * 2;
defaults.fontHeight = fontsizeToHeight(defaults.fontSize);
defaults.fontWidth = fontsizeToWidth(defaults.fontSize);
defaults.halfLineHeight = defaults.lineHeight / 2;
defaults.halfHeight= defaults.height / 2;
class svgElement {
  constructor(tag) {
    this.tag = tag; 
    this.$attribute = [];
    this.$textContent = [];
  }
  setAttribute(name, value) {
    this.$attribute.push([name, value]);
  }
  append(...children) {
    for (const child of children) {
      if(!(child instanceof svgElement) && typeof child !== 'string') {
        throw new Error("Child must be a string or an instance of svgElement");
      }
    }
    this.$textContent.push(...children);
  }
  appendChild(child) {
    if(!(child instanceof svgElement) && typeof child !== 'string') {
      throw new Error("Child must be a string or an instance of svgElement");
    }
    this.$textContent.push(child);
  }
  toString() {
    return `<${this.tag} ${this.$attribute.map(([k, v]) => `${k}="${v}"`).join(' ')}>${this.$textContent.join('')}</${this.tag}>`;
  }
  toSVGElement() {
    const el = document.createElementNS(SVG_NS, this.tag);
    this.$attribute.forEach(([k, v]) => el.setAttribute(k, v));
    this.$textContent.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child.toSVGElement());
      } 
    });
    return el;
  }
  toSVG() {
    return (typeof window === 'undefined' || typeof document === 'undefined')?
      this.toString() : this.toSVGElement();
  }
}


// --- Base Component ---
class Component {
  constructor() { this.width = 0; this.height = 0; this.up = 0; this.down = 0; }
  create(tag) {
    this.svgElement = new svgElement(tag);
    return this.svgElement;
  }
  drawRect(x, y) {
    const rect = this.create("rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y - this.up); 
    rect.setAttribute("width", this.width);
    rect.setAttribute("height", this.height);
    rect.setAttribute("fill", defaults.terminalColor);
    rect.setAttribute("stroke", defaults.terminalStroke);
    return rect;
  } 
  drawText(x, y) {
    if (!this.text) throw new Error("drawText called on a component without text");
    const txt = this.create("text");
    txt.setAttribute("x", x + this.width / 2); 
    txt.setAttribute("y", y + this.textUp);
    txt.setAttribute("text-anchor", "middle");
    txt.append(this.text);
    return txt;
  }
  drawTextBox(x, y) {
    const g = this.create("g");
    g.append(this.drawRect(x, y), this.drawText(x, y));
    this.svgElement = g;
    return g;
  }  
  toElementString(svgElement) {
    return this.svgElement.toString();
  }
  toSVGElement() {
    return this.svgElement.toSVGElement();
  }
  toSVG() {
    const svgElement = this.create("svg");
    svgElement.setAttribute("xmlns", SVG_NS);
    svgElement.setAttribute("xmlns:xlink", SVG_xling);

    svgElement.setAttribute("width", this.width);
    svgElement.setAttribute("height", this.height);
    svgElement.appendChild(this.draw(0, this.height / 2));
    return svgElement.toSVG();
  }
  toString() {
    return this.toElementString(this.toSVGElement());
  }
}

// --- Terminal (The Leaf Node) ---
class Terminal extends Component {
  constructor(text) {
    super();
    this.text = text;
    this.textWidth=textWidth(text, defaults.fontSize)+defaults.spacingBothSizes;
    this.width = text.length * 8 + defaults.spacingBothSizes;
    this.height = defaults.height;
    this.up = defaults.halfHeight ;   // Distance from midline to top
    this.down = defaults.halfHeight;  // Distance from midline to bottom
    this.textHeight=defaults.fontHeight;
    this.textUp=this.up - (this.height - this.textHeight) / 2; // Center text vertically
  }
  draw(x, y) {
    return this.drawTextBox(x, y);
  }
}

// --- Sequence (A , B) ---
class Sequence extends Component {
  constructor(...items) {
    super();
    this.items = items;
    this.width = items.reduce((a, b) => a + b.width, 0) + (items.length - 1) * 10;
    this.up = Math.max(...items.map(i => i.up));
    this.down = Math.max(...items.map(i => i.down));
    this.height = this.up + this.down;
  }
  draw(x, y) {
    const g = this.create("g");
    let curX = x;
    this.items.forEach((item, i) => {
      g.appendChild(item.draw(curX, y));
      curX += item.width;
      if (i < this.items.length - 1) {
        const line = this.create("path");
        line.setAttribute("d", `M ${curX} ${y} h 10`);
        line.setAttribute("stroke", defaults.pathStroke); line.setAttribute("fill", "none");
        g.appendChild(line);
        curX += 10;
      }
    });
    this.svgElement = g;
    return g;
  }
}

// --- Choice (A | B) ---
class Choice extends Component {
  constructor(defaultOption, ...options) {
    super();
    this.defaultOption = defaultOption;
    this.options = options || [];
    const all = [this.defaultOption, ...this.options].filter(x => x);
    
    this.yOffsets = new Array(all.length);

    if (this.defaultOption) {
      this.yOffsets[0] = -(this.defaultOption.down + defaults.spacing);
    }

    let currentY = defaults.spacing;
    const startIdx = this.defaultOption ? 1 : 0;
    for (let i = startIdx; i < all.length; i++) {
      this.yOffsets[i] = currentY + all[i].up;
      currentY += all[i].height + defaults.spacing;
    }

    this.width = Math.max(...all.map(o => o.width), 0) + 40;
    this.up = this.defaultOption ? (this.defaultOption.height + defaults.spacing) : 0;
    this.down = Math.max(currentY - defaults.spacing, 0);
    this.height = this.up + this.down;
  }
  draw(x, y) {
    const g = this.create("g");
    const all = [this.defaultOption, ...this.options].filter(x => x);
    
    const track = this.create("path");
    const topY = this.defaultOption ? y + this.yOffsets[0] : y;
    const botY = this.options.length > 0 ? y + this.yOffsets[all.length - 1] : y;
    
    // Draw the main track line straight through and the vertical spines
    let path = `M ${x} ${y} h ${this.width}`;
    if (all.length > 0) {
      path += ` M ${x + 10} ${topY} v ${botY - topY} M ${x + this.width - 10} ${topY} v ${botY - topY}`;
    }
    track.setAttribute("d", path);
    track.setAttribute("stroke", defaults.pathStroke); track.setAttribute("fill", "none");
    g.append(track);

    all.forEach((opt, i) => {
      g.append(this.drawOption(x, y, opt, this.yOffsets[i]));
    });

    this.svgElement = g;
    return g;
  }
  drawOption(x, y, option, yOffset) {
    const g = this.create("g");
    const line = this.create("path");
    const itemX = x + 20;
    const itemY = y + yOffset;
    
    // Path connects the vertical spine at x+10 to the item at x+20 using S-curves
    const path = `M ${x + 10} ${itemY} h 10 M ${itemX + option.width} ${itemY} h ${this.width - 30 - option.width}`;
    
    line.setAttribute("d", path);
    line.setAttribute("stroke", defaults.pathStroke); line.setAttribute("fill", "none");
    g.append(line, option.draw(itemX, itemY));
    return g;
  }
}

// --- Optional [ A ] ---
class Optional extends Component {
  constructor(item) {
    super();
    this.item = item;
    this.width = item.width + defaults.spacingBothSizes;
    this.up = item.up;
    this.down = item.down + 25;
    this.height = this.up + this.down;
  }
  draw(x, y) {
    const g = this.create("g");
    const skip = this.create("path");
    // Path goes straight (the skip) and loops through the item
    skip.setAttribute("d", `M ${x} ${y} h ${this.width} M ${x} ${y} a 5 5 0 0 1 5 5 v 15 a 5 5 0 0 0 5 5 h ${this.item.width} a 5 5 0 0 0 5 -5 v -15 a 5 5 0 0 1 5 -5`);
    skip.setAttribute("stroke", defaults.pathStroke); skip.setAttribute("fill", defaults.pathFill);
    g.append(skip, this.item.draw(x + 10, y + 25));
    this.svgElement = g;
    return g;
  }
}

// --- ZeroOrMore { A } ---
class ZeroOrMore extends Component {
  constructor(item) {
    super();
    this.item = item;
    this.width = item.width + defaults.spacingBothSizes;
    this.up = item.up + defaults.spacingBothSizes;
    this.down = item.down;
    this.height = this.up + this.down;
  }
  draw(x, y) {
    const g = this.create("g");
    const loop = this.create("path");
    loop.setAttribute("d", `M ${x} ${y} h 10 h ${this.item.width} h 10 M ${x + 10} ${y} a 5 5 0 0 0 -5 5 v 10 a 5 5 0 0 0 5 5 h ${this.item.width} a 5 5 0 0 0 5 -5 v -10 a 5 5 0 0 0 -5 -5`);
    loop.setAttribute("stroke", defaults.pathStroke); loop.setAttribute("fill", defaults.pathFill);
    g.append(loop, this.item.draw(x + 10, y));
    this.svgElement = g;
    return g;
  }
}
class NonTerminal extends Component {
  constructor(name) {
    super();
    this.name = name;
    this.width = name.length * 8 + defaults.spacingBothSizes;
    this.height = defaults.height;
    this.up = defaults.halfHeight;  // Distance from midline to top
    this.down = defaults.halfHeight; // Distance from midline to bottom
  }
  draw(x, y) {
    return this.drawTextBox(x, y);
  }
}

// --- Diagram ---
class Diagram extends Component {
  constructor(root) {
    super();
    this.root = root;
    this.width = root.width + 40;
    this.height = root.height +  40;
    this.up = root.up + defaults.spacingBothSizes;
    this.down = root.down + defaults.spacingBothSizes;
  }
  draw(x, y) {
    const g = this.create("g");
    const line = this.create("path");
    line.setAttribute("d", `M ${x} ${y} h ${defaults.spacingBothSizes} M ${x + defaults.spacingBothSizes + this.root.width} ${y} h ${defaults.spacingBothSizes}`);
    line.setAttribute("stroke", defaults.pathStroke); line.setAttribute("fill", defaults.pathFill);
    g.append(line, this.root.draw(x + defaults.spacingBothSizes, y));
    this.svgElement = g;
    return g;
  }
  toSVG() {
    const svgElement = this.create("svg");
    svgElement.setAttribute("xmlns", SVG_NS);
    svgElement.setAttribute("xmlns:xlink", SVG_xling);
    const totalHeight = this.up + this.down;
    const viewBoxY = -this.up;
    svgElement.setAttribute("viewBox", `0 ${viewBoxY} ${this.width} ${totalHeight}`);
    svgElement.setAttribute("width", this.width);
    svgElement.setAttribute("height", totalHeight);
    svgElement.appendChild(this.draw(0, 0));
    return svgElement.toSVG();
  }

}

export { Diagram, Sequence, Choice, Optional, ZeroOrMore, Terminal, NonTerminal, defaults, svgElement };
export default Diagram;
