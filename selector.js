/*
Selector.js, an JavaScript implementation of a CSS3 Query Selector

Copyright 2009 Henrik Lindqvist <henrik.lindqvist@llamalab.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
/**
 * A JavaScript implementation of a CSS3 Query Selector.
 * <p>For more information, please visit
 * <a href="http://www.w3.org/TR/css3-selectors/" target="_blank">http://www.w3.org/TR/css3-selectors/</a>.</p>
 * @class Selector
 * @version 0.6
 * @author Henrik Lindqvist &lt;<a href="mailto:henrik.lindqvist@llamalab.com">henrik.lindqvist@llamalab.com</a>&gt;
 */

new (function() {
  /**
   * Pre-compiles an Selector query.
   * <p>When creating a <code>new</code> instance of the <code>Selector</code>, the query are
   * pre-compiled for later execution with a call to {@link exec}.</p>
   * <p>The constructor can also be called as a function, without the <code>new</code> keyword. Then
   * the query is executed against the optional context element, otherwise current document.</p>
   * <h4>Example:</h4>
   * <pre>
   *   // Constructor syntax:
   *   new Selector('div > p').exec(document).forEach(function (e) {
   *     e.style.color = 'red';
   *   });
   *   // Or,  shorthand syntax:
   *   Selector('div > p', document).forEach(function (e) {
   *     e.style.color = 'red';
   *   });
   * </pre>
   * @constructor Selector
   * @param {string} pattern - selector pattern.
   * @param {optional Object} context - document or context element.
   */
  function Selector(p, c) {
    if (!(this instanceof Selector)) return new Selector(p).exec(c);
    //if (!qsa)
    this.exec = cache[p] || (cache[p] = new compile(p));
    this.pattern = p;
  }
  /**
   * Ensure document order for group (comma) selector result.
   * <p>Group (comma) queries pre-compiled when when enabled (<code>true</code>) are guaranteed to be
   * in document order. Performance will be affected.</p>
   * @property {static boolean} documentOrder
   */
  //Selector.documentOrder = true;
  Selector.prototype = {
    constructor: Selector,
    /**
     * Execute a selector query.
     * <h4>Example:</h4>
     * <pre>
     *   new Selector('div > p').exec(document).forEach(function (e) {
     *     e.style.color = 'red';
     *   });
     * </pre>
     * @function {Array} exec
     * @param {optional Object} context - document or context element, otherwise current document.
     * @returns Non-live <code>Array</code> with matching elements.
     */
    exec: function exec(c) {
      var pe = this.patchElement,
        pa = this.patchArray,
        p = this.pattern,
        r = pe
          ? map.call((c || d).querySelectorAll(p), pe, this)
          : slice.call((c || d).querySelectorAll(p));
      return pa ? pa.call(this, r) : r;
    },
    /**
     * Returns a string representing the query source pattern.
     * @function {string} toString
     * @returns source pattern.
     */
    toString: function toString() {
      return this.pattern;
    },
    /**
     * Returns a string representing the source code of the Selector.
     * @function {string} toSource
     * @returns source code.
     */
    toSource: function toSource() {
      return 'new Selector("' + this.pattern + '")';
    }
    /**
     * Hook for patching result Element&rsquo;s.
     * <p>When using the {@link Selector} within you own framework you can add this function to
     * extend the resulting <code>Element</code>&rsquo;s before they are returned by {@link exec}.
     * <p>This function is not defined by default, since calling it unneccesarily affects performance.</p>
     * @function {Element} patchElement
     * @param {Element} e - the result element.
     * @returns the patched <code>Element</code>.
     * @see patchArray
     */
    //patchElement : function (e) { return e; },
    /**
     * Hook for patching result Array.
     * <p>When using the {@link Selector} within you own framework you can add this function to
     * extend the resulting <code>Array</code> before it&rsquo;sthey are returned by {@link exec}.
     * <p>This function is not defined by default, since calling it unneccesarily affects performance.</p>
     * @function {Array} patchArray
     * @param {Array} a - the result array.
     * @returns the patched <code>Array</code>.
     * @see patchElement
     */
    //patchArray : function (a) { return a; }
  };
  window.Selector = Selector;
  // ------------------------------------------ Private ------------------------------------------- //
  function $(s) {
    var a = arguments;
    return s.replace(/\$(\d)/g, function(m, i) {
      return a[i];
    });
  }

  var d = document,
    de = d.documentElement,
    qsa = !!d.querySelectorAll,
    bcn = !!d.getElementsByClassName,
    cnl = !!de.children,
    cnlt = cnl && de.children.tags && !wk,
    ec = !!de.contains,
    cdp = !!de.compareDocumentPosition,
    cbp = d.createRange && d.createRange().compareBoundaryPoints,
    si = typeof de.sourceIndex == "number",
    cache = {},
    cmp = {
      "=": 'if($1($2=="$3")){$5}',
      "^=": 'if($1((x=$2)&&!x.indexOf("$3"))){$5}',
      "*=": 'if($1((x=$2)&&x.indexOf("$3")!=-1)){$5}',
      "$=": 'if($1((x=$2)&&x.indexOf("$3",x.length-$4)!=-1)){$5}',
      "~=":
        'if($1((x=$2)&&(y=x.indexOf("$3"))!=-1&&(x.charCodeAt(y-1)||32)==32&&(x.charCodeAt(y+$4)||32)==32)){$5}',
      "|=": 'if($1((x=$2)&&(x=="$3"||!x.indexOf("$3-")))){$5}'
    },
    /*
            cmp = {
               '=': 'if($1($2=="$3")){$5}',
              '^=': 'if($1((x=$2)&&!x.indexOf("$3"))){$5}',
              '*=': 'if($1((x=$2)&&x.indexOf("$3")!=-1)){$5}',
              '$=': 'if($1/$3$/.test($2)){$5}',
              '~=': 'if($1/(^|\\s)$3(\\s|$)/.test($2)){$5}',
              '|=': 'if($1/^$3(-|$)/.test($2)){$5}'
            },
        */
    slice = Array.prototype.slice,
    map =
      Array.prototype.map ||
      function(fn, tp) {
        var i = this.length,
          r = new Array(i);
        while (--i >= 0) {
          r[i] = fn.call(tp, this[i], i, this);
        }
        return r;
      };

  Selector.guid = 0;
  Selector.nthIndex = function(LLi, c, r, tp, tv) {
    var p = c.parentNode,
      ci = "LLi#" + tv,
      pl = "LLi$" + tv;
    if (!p) return Number.NaN;
    if (!c[ci] || c.LLi != LLi) {
      for (var n = p.firstChild, i = 0; n; n = n.nextSibling) {
        if (n[tp] == tv) {
          n[ci] = ++i;
          n.LLi = LLi;
        }
      }
      p[pl] = i;
    }
    return r ? 1 + p[pl] - c[ci] : c[ci];
  };
  Selector.srcIndex = function(h, n) {
    var i = -1,
      x;
    do {
      if (n.nodeType === 1) {
        i++;
        if ((x = h[n.LLn])) return x + i;
      }
      if ((x = n.previousSibling)) {
        do {
          n = x;
        } while ((x = x.lastChild));
      } else n = n.parentNode;
    } while (n);
    return i;
  };
  /*
    Selector.srcIndex = function (h, n) {
      var i = 0, x;
      do {
        if (x = n.previousSibling) {
          n = x;
          if (n.getElementsByTagName) {
            if (x = h[n.LLn]) return x + i + 1;
            i += n.getElementsByTagName('*').length + 1;
          }
        }
        else if (n = n.parentNode) i++;
      } while (n);
      return i;
    }
    */
  function compile(qp) {
    this.dup = this.srt = this.idx = this.i = this.nqp = 0;

    var _ref4 = this;

    var _ret = (function(
      qp,
      nqp,
      i,
      $,
      srt,
      type,
      cdp,
      cbp,
      dup,
      idx,
      me,
      Function
    ) {
      var js = "";
      do {
        i = nqp = 0;
        js += $(
          "n=c;$1q:do{$2}while(false);",
          srt ? "s=0;" : "",
          type(
            qp,
            $(
              srt
                ? "for(x=r.length;s<x;z=s+((x-s)/2)|0,($1)?s=z+1:x=z);if(s<r.length)r.splice(s++,0,$2);else r[s++]=$2;"
                : "r[s++]=$2;",
              cdp
                ? "r[z].compareDocumentPosition(n)&4"
                : cbp
                ? "a.selectNode(r[z])||a.collapse(1)||b.selectNode(n)||b.collapse(1)||a.compareBoundaryPoints(1,b)<0"
                : "h[r[z].LLn]<h[n.LLn]",
              "pe?pe.call(this,n):n"
            ),
            0,
            "*"
          )
        );
      } while ((qp = nqp));
      js = $(
        "var r=[],s=0,n,x,y,z,d=c?c.ownerDocument||c.document||c:c=document,pe=this.patchElement,pa=this.patchArray$1$2$3;$4return pa?pa.call(this,r):r;",
        dup > 0 ? ",h={}" : "",
        idx
          ? me
            ? ",LLi=d.LLi||(d.LLi=++Selector.guid)"
            : ",LLi=++Selector.guid"
          : "",
        srt && cbp && !cdp ? ",a=d.createRange(),b=d.createRange()" : "",
        js
      );
      //console.log(js);
      return {
        v: new Function("c", js)
      };
    })(
      "qp" in _ref4 ? _ref4.qp : typeof qp !== "undefined" ? qp : undefined,
      "nqp" in _ref4 ? _ref4.nqp : typeof nqp !== "undefined" ? nqp : undefined,
      "i" in _ref4 ? _ref4.i : typeof i !== "undefined" ? i : undefined,
      "$" in _ref4 ? _ref4.$ : typeof $ !== "undefined" ? $ : undefined,
      "srt" in _ref4 ? _ref4.srt : typeof srt !== "undefined" ? srt : undefined,
      "type" in _ref4
        ? _ref4.type
        : typeof type !== "undefined"
        ? type
        : undefined,
      "cdp" in _ref4 ? _ref4.cdp : typeof cdp !== "undefined" ? cdp : undefined,
      "cbp" in _ref4 ? _ref4.cbp : typeof cbp !== "undefined" ? cbp : undefined,
      "dup" in _ref4 ? _ref4.dup : typeof dup !== "undefined" ? dup : undefined,
      "idx" in _ref4 ? _ref4.idx : typeof idx !== "undefined" ? idx : undefined,
      "me" in _ref4 ? _ref4.me : typeof me !== "undefined" ? me : undefined,
      "Function" in _ref4
        ? _ref4.Function
        : typeof Function !== "undefined"
        ? Function
        : undefined
    );

    if (
      (typeof _ret === "undefined" ? "undefined" : _typeof(_ret)) === "object"
    )
      return _ret.v;
  }
  compile.prototype = {
    type: function type(qp, js, n, s, c) {
      var _ref5 = this;

      var _ret2 = (function(
        qp,
        n,
        c,
        dup,
        js,
        pred,
        cnlt,
        $,
        i,
        cnl,
        ie,
        s,
        String
      ) {
        var m = /^\s*([\w-]+|\*)?(.*)/.exec(qp),
          t = m[1] || "*";
        if (!n && c == " " && !dup) dup = 1;
        js = pred(m[2], js, n, t, c);
        switch (c) {
          case ">":
            return {
              v:
                cnlt && t != "*"
                  ? $(
                      'for(var n$1=n.children.tags("$2"),i$1=0;n=n$1[i$1++];){$3}',
                      ++i,
                      t,
                      js
                    )
                  : $(
                      cnl
                        ? "for(var n$1=n.children,i$1=0;n=n$1[i$1++];)$2{$3}"
                        : "for(n=n.firstChild;n;n=n.nextSibling)$2{$3}",
                      ++i,
                      t != "*"
                        ? 'if(n.nodeName==="' + t.toUpperCase() + '")'
                        : !cnl || ie
                        ? "if(n.nodeType===1)"
                        : "",
                      js
                    )
            };
          case "+":
            return {
              v: $(
                "while(n=n.nextSibling)if(n.node$1){$2break}else if(n.nodeType===1)break;",
                t == "*" ? "Type===1" : 'Name==="' + t.toUpperCase() + '"',
                js
              )
            };
          case "~":
            return {
              v: $(
                "while(n=n.nextSibling)if(n.node$1){$3}else if(n.node$2)break;",
                t == "*" ? "Type===1" : 'Name==="' + t.toUpperCase() + '"',
                s == "*" ? "Type===1" : 'Name==="' + s.toUpperCase() + '"',
                js
              )
            };
          default:
            return {
              v:
                (typeof js === "undefined" ? "undefined" : _typeof(js)) ==
                "object"
                  ? String(js) // handled by pred
                  : n
                  ? t == "*"
                    ? js
                    : $('if(n.nodeName!="$1"){$2}', t.toUpperCase(), js)
                  : $(
                      'for(var n$1=n.getElementsByTagName("$2"),i$1=0;n=n$1[i$1++];)$3{$4}',
                      ++i,
                      t,
                      ie && t == "*" ? "if(n.nodeType===1)" : "",
                      js
                    )
            };
        }
      })(
        "qp" in _ref5 ? _ref5.qp : typeof qp !== "undefined" ? qp : undefined,
        "n" in _ref5 ? _ref5.n : typeof n !== "undefined" ? n : undefined,
        "c" in _ref5 ? _ref5.c : typeof c !== "undefined" ? c : undefined,
        "dup" in _ref5
          ? _ref5.dup
          : typeof dup !== "undefined"
          ? dup
          : undefined,
        "js" in _ref5 ? _ref5.js : typeof js !== "undefined" ? js : undefined,
        "pred" in _ref5
          ? _ref5.pred
          : typeof pred !== "undefined"
          ? pred
          : undefined,
        "cnlt" in _ref5
          ? _ref5.cnlt
          : typeof cnlt !== "undefined"
          ? cnlt
          : undefined,
        "$" in _ref5 ? _ref5.$ : typeof $ !== "undefined" ? $ : undefined,
        "i" in _ref5 ? _ref5.i : typeof i !== "undefined" ? i : undefined,
        "cnl" in _ref5
          ? _ref5.cnl
          : typeof cnl !== "undefined"
          ? cnl
          : undefined,
        "ie" in _ref5 ? _ref5.ie : typeof ie !== "undefined" ? ie : undefined,
        "s" in _ref5 ? _ref5.s : typeof s !== "undefined" ? s : undefined,
        "String" in _ref5
          ? _ref5.String
          : typeof String !== "undefined"
          ? String
          : undefined
      );

      if (
        (typeof _ret2 === "undefined" ? "undefined" : _typeof(_ret2)) ===
        "object"
      )
        return _ret2.v;
    },
    pred: (function(_pred) {
      function pred(_x, _x2, _x3, _x4, _x5) {
        return _pred.apply(this, arguments);
      }

      pred.toString = function() {
        return _pred.toString();
      };

      return pred;
    })(function(qp, js, n, t, c) {
      var _ref6 = this;

      var _ret3 = (function(
        qp,
        n,
        type,
        js,
        t,
        nqp,
        dup,
        srt,
        Selector,
        Error,
        $,
        cdp,
        cbp,
        si,
        pred,
        uniq,
        c,
        ie,
        bcn,
        mz,
        Object,
        i,
        cmp,
        ab,
        am,
        flo,
        idx
      ) {
        var m =
            /^([#\.])([\w-]+)(.*)/.exec(qp) ||
            /^(\[)\s*([\w-]+)\s*(?:([~|^$*]?=)\s*(?:(['"])(.*?)\4|([\w-]+)))?\s*\](.*)/.exec(
              qp
            ) ||
            /^:(first|last|only)-(?:(child)|of-type)(.*)/.exec(qp) ||
            /^:(nth)-(?:(last)-)?(?:(child)|of-type)\(\s*(?:(odd|even)|(-|\d*)n([+-]\d+)?|([1-9]\d*))\s*\)(.*)/.exec(
              qp
            ) ||
            /^:(active|checked|(?:dis|en)abled|empty|focus|link|root|target)(.*)/.exec(
              qp
            ) ||
            /^:(lang)\(\s*(['"])?(.*?)\2\s*\)(.*)/.exec(qp) ||
            (!n && /^:(not)\(\s*(.*)\s*\)(.*)/.exec(qp)),
          x = 0;
        if (!m) {
          if (!n && (m = /^\s*([+>~,\s])\s*(\S.*)/.exec(qp))) {
            if (m[1] != ",")
              return {
                v: type(m[2], js, n, t, m[1])
              };
            nqp = m[2];
            dup = 2;
            srt = Selector.documentOrder;
          } else if (/\S/.test(qp))
            throw new Error("Illegal query near: " + qp);
          return {
            v:
              dup < 1
                ? js
                : $(
                    "if(!h[x=n.LLn||(n.LLn=++Selector.guid)]){h[x]=$1;$2}",
                    !srt || cdp || cbp
                      ? "true"
                      : si
                      ? "n.sourceIndex"
                      : "Selector.srcIndex(h,n)",
                    js
                  )
          };
        }
        if (!n && m[1] == "#" && dup != 2) dup = -1;
        js = pred(m[m.length - 1], js, n, t, 1);
        switch (m[1]) {
          case "#":
            return {
              v: uniq(
                js,
                n,
                t,
                c,
                ie,
                "n.id",
                '"' + m[2] + '"',
                'd.getElementById("' + m[2] + '")'
              )
            };
          case ".":
            return {
              v:
                bcn && !n && (!c || c == " ") && (t == "*" || !mz)
                  ? Object(
                      $(
                        'for(var n$1=n.getElementsByClassName("$2"),i$1=0;n=n$1[i$1++];)$3{$4}',
                        ++i,
                        m[2],
                        t == "*"
                          ? ""
                          : 'if(n.nodeName==="' + t.toUpperCase() + '")',
                        js
                      )
                    )
                  : $(
                      cmp["~="],
                      n ? "!" : "",
                      "n.className",
                      (x = m[2]),
                      x.length,
                      js
                    )
            };
          case "[":
            return {
              v: (x = m[3])
                ? $(
                    cmp[x],
                    n ? "!" : "",
                    ie
                      ? (x = m[2].toLowerCase()) == "style"
                        ? "style.cssText.toLowerCase()"
                        : ab[x]
                        ? "n." + x + '&&"' + x + '"'
                        : 'n.getAttribute("' + (am[x] || x) + '",2)'
                      : 'n.getAttribute("' + m[2] + '")',
                    (x = m[5] || m[6]),
                    x.length,
                    js
                  )
                : $(
                    ie
                      ? 'if($1((x=n.getAttributeNode("$2"))&&x.specified)){$3}'
                      : 'if($1n.hasAttribute("$2")){$3}',
                    n ? "!" : "",
                    m[2],
                    js
                  )
            };
          case "active":
          case "focus":
            return {
              v: uniq(js, n, t, c, 0, "n", "d.activeElement")
            };
          case "checked":
            return {
              v: $("if($1(n.checked||n.selected)){$2}", n ? "!" : "", js)
            };
          case "disabled":
            x = 1;
          case "enabled":
            return {
              v: $(
                "if(n.disabled===$1$2){$3}",
                !!(x ^ n),
                ie
                  ? '&&((x=n.nodeName)==="BUTTON"||x==="INPUT"||x==="OPTION"||x==="OPTGROUP"||x==="SELECT"||x==="TEXTAREA"'
                  : "",
                js
              )
            };
          case "empty":
            return {
              v: $(
                "for(x=n.firstChild;x&&x.nodeType>3;x=x.nextSibling);if($1x){$2}",
                n ? "" : "!",
                js
              )
            };
          case "first":
            return {
              v: flo(js, n, m[2], "previous")
            };
          case "lang":
            return {
              v: $(cmp["|="], n ? "!" : "", "n.lang", (x = m[3]), x.length, js)
            };
          case "last":
            return {
              v: flo(js, n, m[2], "next")
            };
          case "link":
            return {
              v: $('if($1(n.nodeName==="A"&&n.href)){$2}', n ? "!" : "", js)
            };
          case "nth":
            var a = m[4]
                ? 2
                : m[5] == "-"
                ? -1
                : m[7]
                ? 0
                : m[5]
                ? m[5] - 0
                : 1,
              b = m[4] == "odd" ? 1 : (m[6] || m[7]) - 0 || 0;
            if (a == 1)
              return {
                v: js
              };
            if (a == 0 && b == 1)
              return {
                v: flo(js, n, m[3], m[2] ? "next" : "previous")
              };
            if (a == b) b = 0;
            if (b < 0) b = a + b;
            idx = 1;
            return {
              v: $(
                'if($1(Selector.nthIndex(LLi,n,$2,"node$3",$4)$5)){$6}',
                n ? "!" : "",
                !!m[2],
                m[3] ? "Type" : "Name",
                m[3] ? "1" : "n.nodeName",
                a < 0 ? "<=" + b : a ? "%" + a + "===" + b : "===" + b,
                js
              )
            };
          case "not":
            return {
              v: type(m[2], js, 1, "*")
            };
          case "only":
            return {
              v: flo(js, n, m[2])
            };
          case "root":
            return {
              v: uniq(js, n, t, c, 0, "n", "d.documentElement")
            };
          case "target":
            x =
              "(d.defaultView||d.parentWindow||window).location.hash.substr(1)";
            return {
              v: uniq(js, n, t, c, ie, "n.id", x, "d.getElementById(" + x + ")")
            };
        }
      })(
        "qp" in _ref6 ? _ref6.qp : typeof qp !== "undefined" ? qp : undefined,
        "n" in _ref6 ? _ref6.n : typeof n !== "undefined" ? n : undefined,
        "type" in _ref6
          ? _ref6.type
          : typeof type !== "undefined"
          ? type
          : undefined,
        "js" in _ref6 ? _ref6.js : typeof js !== "undefined" ? js : undefined,
        "t" in _ref6 ? _ref6.t : typeof t !== "undefined" ? t : undefined,
        "nqp" in _ref6
          ? _ref6.nqp
          : typeof nqp !== "undefined"
          ? nqp
          : undefined,
        "dup" in _ref6
          ? _ref6.dup
          : typeof dup !== "undefined"
          ? dup
          : undefined,
        "srt" in _ref6
          ? _ref6.srt
          : typeof srt !== "undefined"
          ? srt
          : undefined,
        "Selector" in _ref6
          ? _ref6.Selector
          : typeof Selector !== "undefined"
          ? Selector
          : undefined,
        "Error" in _ref6
          ? _ref6.Error
          : typeof Error !== "undefined"
          ? Error
          : undefined,
        "$" in _ref6 ? _ref6.$ : typeof $ !== "undefined" ? $ : undefined,
        "cdp" in _ref6
          ? _ref6.cdp
          : typeof cdp !== "undefined"
          ? cdp
          : undefined,
        "cbp" in _ref6
          ? _ref6.cbp
          : typeof cbp !== "undefined"
          ? cbp
          : undefined,
        "si" in _ref6 ? _ref6.si : typeof si !== "undefined" ? si : undefined,
        "pred" in _ref6
          ? _ref6.pred
          : typeof pred !== "undefined"
          ? pred
          : undefined,
        "uniq" in _ref6
          ? _ref6.uniq
          : typeof uniq !== "undefined"
          ? uniq
          : undefined,
        "c" in _ref6 ? _ref6.c : typeof c !== "undefined" ? c : undefined,
        "ie" in _ref6 ? _ref6.ie : typeof ie !== "undefined" ? ie : undefined,
        "bcn" in _ref6
          ? _ref6.bcn
          : typeof bcn !== "undefined"
          ? bcn
          : undefined,
        "mz" in _ref6 ? _ref6.mz : typeof mz !== "undefined" ? mz : undefined,
        "Object" in _ref6
          ? _ref6.Object
          : typeof Object !== "undefined"
          ? Object
          : undefined,
        "i" in _ref6 ? _ref6.i : typeof i !== "undefined" ? i : undefined,
        "cmp" in _ref6
          ? _ref6.cmp
          : typeof cmp !== "undefined"
          ? cmp
          : undefined,
        "ab" in _ref6 ? _ref6.ab : typeof ab !== "undefined" ? ab : undefined,
        "am" in _ref6 ? _ref6.am : typeof am !== "undefined" ? am : undefined,
        "flo" in _ref6
          ? _ref6.flo
          : typeof flo !== "undefined"
          ? flo
          : undefined,
        "idx" in _ref6
          ? _ref6.idx
          : typeof idx !== "undefined"
          ? idx
          : undefined
      );

      if (
        (typeof _ret3 === "undefined" ? "undefined" : _typeof(_ret3)) ===
        "object"
      )
        return _ret3.v;
    }),
    uniq: function uniq(js, n, t, c, d, p, v, w) {
      return n || (c && c != " ") || d
        ? $(n ? "if($1!==$2){$3}" : "if($1===$2){$3break q}", p, v, js)
        : Object(
            $(
              ec
                ? "if((x=$1)===n||!n.contains||n.contains(x))$2"
                : cdp
                ? "if((x=$1)===n||!n.compareDocumentPosition||n.compareDocumentPosition(x)&16)$2"
                : "for(x=y=$1;y;y=y.parentNode)if(y===n)$2",
              w || v,
              t == "*"
                ? "{n=x;" + js + "break q}"
                : '{if((n=x).nodeName==="' +
                    t.toUpperCase() +
                    '"){' +
                    js +
                    "}break q}"
            )
          );
    },
    flo: function flo(js, n, t, s) {
      return $(
        s
          ? "for($2x=n.$1Sibling;x&&x.node$3;x=x.$1Sibling);if($4x){$5}"
          : "for($2(x=n.parentNode)&&(x=x.firstChild);x&&(x.node$3||x===n);x=x.nextSibling);if($4x){$5}",
        s,
        t ? "" : "y=n.nodeName,",
        t ? "Type!==1" : "Name!==y",
        n ? "" : "!",
        js
      );
    }
  };
})();
