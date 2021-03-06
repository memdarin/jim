import { Roman2Hiragana } from './Roman2Hiragana';
import { Conversion } from "./Conversion";
const caretPos = require("textarea-caret");

interface ISegmentsInfo {
    curpos: number;
    segments: any;
    sels: any;
}

export class Sentence {
    $textArea: HTMLTextAreaElement;
    status: boolean;
    inputText: string;
    hiragana: string;
    focusedContextMenuItem: string;
    insPos: number;
    preLen: number;
    katakana: boolean;
    popuped: boolean;
    segmentsInfo: ISegmentsInfo | null = null;
    conv: Conversion;
    contextMenuSelector: string;
    $menu: any;

    constructor($textArea: HTMLTextAreaElement, contextMenuSelector: string) {
        this.$textArea = $textArea;
        this.contextMenuSelector = contextMenuSelector;
        this.conv = new Conversion();
        this.status = true;

        this.initProp();

        // 変換候補が選択されているかの判定.
        // このクラス内で登録したメニューかの識別はおこなっていない.
        // クラスが破棄されたあとの動作は考えていない.
        // $(document.body).on("contextmenu:focus", ".context-menu-item",
        //     (e) => {
        //         this.focusedContextMenuItem = e.target.textContent;
        //         if (this.isPreEdit()) {
        //             const s = this.getSeledTxt(this.focusedContextMenuItem);
        //             this.insFld(s.txt, this.insPos, this.insPos + this.preLen, s.dlt);
        //             this.preLen = s.txt.length;
        //         }
        //     });
        $(document.body).on("contextmenu:blur", ".context-menu-item",
            (e) => {
                this.focusedContextMenuItem = '';
            });

        $textArea.addEventListener("keydown", (e: KeyboardEvent) => {
            this.onKeydown(e);
        });
        $textArea.addEventListener("keypress", (e: KeyboardEvent) => {
            this.onKeypress(e);
        });
    }

    onKeydown(event: KeyboardEvent) {
        if (event.keyCode === 8) {
            if (this.isPreEdit()) {
                if (this.inputText) {
                    this.inputText = this.inputText.substr(0, this.inputText.length - 1);
                } else {
                    this.hiragana = this.hiragana.substr(0, this.hiragana.length - 1);
                }
                this.predictive();
                event.preventDefault();
            }
        } else if (event.keyCode === 27) {
            if (this.isPreEdit()) {
                if (this.focusedContextMenuItem) {
                    this.predictive();
                } else {
                    this.insFld("", this.insPos, this.insPos + this.preLen);
                    this.initProp();
                }
                event.preventDefault();
            }
        } else if (event.keyCode === 13) {
            if (this.isPreEdit()) {
                setTimeout(() => {
                    this.initProp();
                }, 100);
                event.preventDefault();
            }
        } else if (event.ctrlKey && event.keyCode === 74) {
            if (this.isPreEdit()) {
                const katakana = Roman2Hiragana.katakana(this.hiragana + this.inputText).text;
                this.insFld(katakana, this.insPos, this.insPos + this.preLen);
                this.preLen = katakana.length;
                this.katakana = true;
            } else {
                this.status = !this.status;
            }
            event.preventDefault();
        } else if (event.keyCode === 32) {
            if (this.isPreEdit()) {
                if (this.popuped) {
                    // this.$menu.trigger('nextcommand');
                } else {
                    this.normal();
                }
                event.preventDefault();
            }
        } else if (event.keyCode === 37) {
            if (this.isPreEdit() && this.segmentsInfo) {
                this.switchSegment(-1);
                event.preventDefault();
            }
        } else if (event.keyCode === 39) {
            if (this.isPreEdit() && this.segmentsInfo) {
                this.switchSegment(1);
                event.preventDefault();
            }
        }
    }

    onKeypress(event) {
        if (this.status) {
            const chr = String.fromCharCode(event.which);
            // var code = event.keyCode != 0 ? event.keyCode: event.which;
            const code = event.which;
            if (32 < code && code < 127) {
                if (this.focusedContextMenuItem || this.katakana) {
                    // 選択中の候補があったので、確定する.
                    const pos = this.insPos + this.preLen;
                    this.$textArea.selectionStart = pos;
                    this.$textArea.selectionEnd = pos;
                    this.initProp();
                }
                if (!this.isPreEdit()) {
                    this.insPos = this.$textArea.selectionStart;
                }
                this.inputText = this.inputText + chr.toLocaleLowerCase();
                this.predictive();
                event.preventDefault();
            }
        }
    }

    initProp() {
        this.inputText = "";
        this.hiragana = "";
        this.segmentsInfo = null;
        $.contextMenu("destroy", this.contextMenuSelector);
        this.popuped = false;
        this.katakana = false;
        this.preLen = 0;
    }

    setSegmentsInfo(segments) {
        const len = segments.length;
        const sels = new Array(len);
        for (let idx = 0; idx < len; idx++) {
            sels[idx] = segments[idx].candidates[0];
        }

        this.segmentsInfo = { curpos: 0, segments, sels };
    }

    getSeledTxt(in_txt: string, in_pos?: number) {
        const ret = { txt: in_txt, dlt: null };
        if (this.segmentsInfo) {
            ret.txt = "";
            const pos = in_pos !== undefined ? in_pos : this.segmentsInfo.curpos;
            if (in_txt) {
                this.segmentsInfo.sels[pos] = in_txt;
            }
            const len = this.segmentsInfo.segments.length;
            for (let idx = 0; idx < len; idx++) {
                ret.txt = ret.txt + this.segmentsInfo.sels[idx];
            }
            ret.dlt = 0;
            for (let idx = 0; idx <= pos; idx++) {
                ret.dlt = ret.dlt + this.segmentsInfo.sels[idx].length;
            }
        }
        return ret;
    }

    isPreEdit(): boolean {
        return !(this.inputText === "" && this.hiragana === "");
    }

    predictive() {
        // ローマ字へ変換.
        const conv = Roman2Hiragana.conv(this.inputText);
        if (conv.complete) {
            // ローマ字へ変換が完了(ひらがな確定とほぼ同義)
            this.hiragana = this.hiragana + conv.text;
            conv.text = "";
            // 入力中のテキストはクリア.
            this.inputText = "";
        }
        const sentence = this.hiragana + conv.text;
        this.insFld(sentence, this.insPos, this.insPos + this.preLen);
        this.preLen = sentence.length;

        this.get("predictive", sentence);
        this.popuped = false;
    }

    normal() {
        const sentence = this.hiragana;
        this.get("normal", sentence);
        this.popuped = true;
    }

    get(mode, sentence) {
        this.segmentsInfo = null;
        this.conv.get(mode, sentence, (err, resp) => {
            if (!err) {
                // エラーになるがとりあえず動くのでそのまま.
                $.contextMenu('destroy', this.contextMenuSelector);

                if (sentence) {
                    if (mode === "normal") {
                        this.setSegmentsInfo(resp.segments);
                    }
                    const candidates = resp.segments[0].candidates;
                    const len = candidates.length;
                    if (len > 0) {
                        this.setPopupItem(
                            mode,
                            candidates,
                            (opt) => {
                                if (mode === "normal") {
                                    // 通常の変換ならば、最初の項目を選択しておく.
                                    opt.$menu.trigger(
                                        "nextcommand"
                                    );
                                }
                            }
                        );

                        const cp = this.caretPos();
                        $(this.contextMenuSelector).contextMenu(
                            {
                                x: cp.left,
                                y: cp.top + 18 // ここの値は本来ならフォントサイズから求めるべきだが
                            }
                        );
                    }
                }
            }
        });
    }

    setPopupItem(mode, candidates, cb) {
        const len = candidates.length;

        // 推測変換候補をitemsにする.
        const items = {};
        for (let idx = 0; idx < len; idx++) {
            const word = candidates[idx];
            // items[word] = { name: _.escape(word) };
            items[word] = { name: word };
        }

        const _this = this;
        $.contextMenu({
            selector: this.contextMenuSelector,
            trigger: 'none',
            position: (opt: any, x, y) => {
                const $win = $(window);
                const bottom = $win.scrollTop() + $win.height();
                const height = opt.$menu.height();
                if (y + height > bottom) {
                    y = bottom - height;
                    if (y < 0) {
                        y = 0;
                    }
                    x = x + 8; // ここの値は本来ならフォントサイズから求めるべきだが
                }
                opt.$menu.css({ top: y, left: x });
                if (cb) {
                    cb(opt);
                }
                this.$menu = opt.$menu;
            },
            callback: (key, options) => {
                const selTxt = this.getSeledTxt(key).txt;
                this.insFld(selTxt, this.insPos, this.insPos + this.preLen);
                this.initProp();

                this.$textArea.focus();
                this.$textArea.selectionEnd = this.insPos + selTxt.length;
            },
            items
        });
    }

    switchSegment(allow) {
        let refresh = false;
        if (allow < 0) {
            if (this.segmentsInfo.curpos > 0) {
                this.segmentsInfo.curpos--;
                refresh = true;
            }
        } else {
            if (this.segmentsInfo.curpos < this.segmentsInfo.segments.length - 1) {
                this.segmentsInfo.curpos++;
                refresh = true;
            }
        }
        if (refresh) {
            const curpos = this.segmentsInfo.curpos;
            $.contextMenu("destroy", this.contextMenuSelector);
            const candidates = this.segmentsInfo.segments[curpos].candidates;
            this.setPopupItem("normal", candidates, (opt) => {
                const i = candidates.indexOf(this.segmentsInfo.sels[curpos]);
                for (let idx = 0; idx <= i; idx++) {
                    opt.$menu.trigger('nextcommand');
                }
            });

            const cp = this.caretPos();
            $(this.contextMenuSelector).contextMenu({
                x: cp.left,
                y: cp.top + 18  // ここの値は本来ならフォントサイズから求めるべきだが
            });
        }
    }

    insFld(insTxt, insStartPos, insEndPos, dltPos?) {
        let startPos = insStartPos;
        let endPos = insEndPos;
        if (insStartPos === undefined) {
            startPos = this.$textArea.selectionStart;
        }
        if (insEndPos === undefined) {
            endPos = this.$textArea.selectionEnd;
        }
        const t = this.$textArea.value;
        const p = t.substr(0, startPos);
        const s = t.substring(endPos);
        this.$textArea.value = p + insTxt + s;
        let pos = startPos + insTxt.length;
        if (dltPos) {
            pos = startPos + dltPos;
        }
        this.$textArea.selectionStart = pos;
        this.$textArea.selectionEnd = pos;
    }

    caretPos() {
        const el = this.$textArea;
        const cp = caretPos(el, el.selectionEnd);
        return {
            top: el.offsetTop
                - el.scrollTop
                + cp.top,
            left: el.offsetLeft
                - el.scrollLeft
                + cp.left
        };
    }

    getElementPos(element) {
        // Get scroll amount.
        const html = document.documentElement;
        const body = document.body;
        const scrollLeft = (body.scrollLeft || html.scrollLeft);
        const scrollTop = (body.scrollTop || html.scrollTop);

        // Adjust "IE 2px bugfix" and scroll amount.
        const rect = element.getBoundingClientRect();
        const left = rect.left - html.clientLeft + scrollLeft;
        const top = rect.top - html.clientTop + scrollTop;
        const right = rect.right - html.clientLeft + scrollLeft;
        const bottom = rect.bottom - html.clientTop + scrollTop;
        return {
            left: (left), top: (top),
            right: (right), bottom: (bottom)
        };
    }
}
