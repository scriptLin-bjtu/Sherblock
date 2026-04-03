(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=new class{constructor(){this.ws=null,this.url=``,this.reconnectInterval=3e3,this.maxReconnectAttempts=10,this.reconnectAttempts=0,this.listeners=new Map,this.messageQueue=[],this.isConnecting=!1,this.shouldReconnect=!0}connect(e=`ws://localhost:8080`){if(this.ws&&(this.ws.readyState===WebSocket.CONNECTING||this.ws.readyState===WebSocket.OPEN)){console.log(`[WebSocket] Already connected or connecting`);return}this.url=e,this.isConnecting=!0;try{this.ws=new WebSocket(e),this.ws.onopen=()=>{console.log(`[WebSocket] Connected`),this.isConnecting=!1,this.reconnectAttempts=0,this.emit(`connected`,{}),this.flushMessageQueue()},this.ws.onmessage=e=>{try{let t=JSON.parse(e.data);console.log(`[WebSocket] Received:`,t.type),this.emit(`message`,t),t.type&&this.emit(t.type,t)}catch(e){console.error(`[WebSocket] Parse error:`,e)}},this.ws.onclose=e=>{console.log(`[WebSocket] Disconnected:`,e.code,e.reason),this.isConnecting=!1,this.emit(`disconnected`,{code:e.code,reason:e.reason}),this.shouldReconnect&&this.reconnectAttempts<this.maxReconnectAttempts&&this.scheduleReconnect()},this.ws.onerror=e=>{console.error(`[WebSocket] Error:`,e),this.isConnecting=!1,this.emit(`error`,{error:e})}}catch(e){console.error(`[WebSocket] Connection error:`,e),this.isConnecting=!1,this.scheduleReconnect()}}scheduleReconnect(){this.shouldReconnect&&(this.reconnectAttempts++,console.log(`[WebSocket] Reconnecting in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`),setTimeout(()=>{this.shouldReconnect&&this.connect(this.url)},this.reconnectInterval))}send(e){this.ws&&this.ws.readyState===WebSocket.OPEN?this.ws.send(JSON.stringify(e)):(console.log(`[WebSocket] Not connected, queuing message`),this.messageQueue.push(e))}sendAndWait(e,t,n=3e4){return new Promise((r,i)=>{let a=setTimeout(()=>{this.off(t,o),i(Error(`Timeout waiting for ${t}`))},n),o=e=>{clearTimeout(a),r(e)};this.on(t,o),this.send(e)})}flushMessageQueue(){for(;this.messageQueue.length>0;){let e=this.messageQueue.shift();this.send(e)}}disconnect(){this.shouldReconnect=!1,this.ws&&=(this.ws.close(),null)}on(e,t){this.listeners.has(e)||this.listeners.set(e,[]),this.listeners.get(e).push(t)}off(e,t){if(!this.listeners.has(e))return;let n=this.listeners.get(e),r=n.indexOf(t);r>-1&&n.splice(r,1)}emit(e,t){this.listeners.has(e)&&this.listeners.get(e).forEach(n=>{try{n(t)}catch(t){console.error(`[WebSocket] Event handler error for ${e}:`,t)}})}isConnected(){return this.ws&&this.ws.readyState===WebSocket.OPEN}};function t(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var n=t();function r(e){n=e}var i={exec:()=>null};function a(e,t=``){let n=typeof e==`string`?e:e.source,r={replace:(e,t)=>{let i=typeof t==`string`?t:t.source;return i=i.replace(s.caret,`$1`),n=n.replace(e,i),r},getRegex:()=>new RegExp(n,t)};return r}var o=(()=>{try{return!0}catch{return!1}})(),s={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:e=>RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:e=>RegExp(`^ {0,${Math.min(3,e-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:e=>RegExp(`^ {0,${Math.min(3,e-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:e=>RegExp(`^ {0,${Math.min(3,e-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:e=>RegExp(`^ {0,${Math.min(3,e-1)}}#`),htmlBeginRegex:e=>RegExp(`^ {0,${Math.min(3,e-1)}}<(?:[a-z].*>|!--)`,`i`),blockquoteBeginRegex:e=>RegExp(`^ {0,${Math.min(3,e-1)}}>`)},c=/^(?:[ \t]*(?:\n|$))+/,l=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,u=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,d=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,ee=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,f=/ {0,3}(?:[*+-]|\d{1,9}[.)])/,p=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,m=a(p).replace(/bull/g,f).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,``).getRegex(),te=a(p).replace(/bull/g,f).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),h=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,ne=/^[^\n]+/,g=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,re=a(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace(`label`,g).replace(`title`,/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),ie=a(/^(bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,f).getRegex(),_=`address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul`,v=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,ae=a(`^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))`,`i`).replace(`comment`,v).replace(`tag`,_).replace(`attribute`,/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),oe=a(h).replace(`hr`,d).replace(`heading`,` {0,3}#{1,6}(?:\\s|$)`).replace(`|lheading`,``).replace(`|table`,``).replace(`blockquote`,` {0,3}>`).replace(`fences`," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace(`list`,` {0,3}(?:[*+-]|1[.)])[ \\t]`).replace(`html`,`</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)`).replace(`tag`,_).getRegex(),y={blockquote:a(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace(`paragraph`,oe).getRegex(),code:l,def:re,fences:u,heading:ee,hr:d,html:ae,lheading:m,list:ie,newline:c,paragraph:oe,table:i,text:ne},se=a(`^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)`).replace(`hr`,d).replace(`heading`,` {0,3}#{1,6}(?:\\s|$)`).replace(`blockquote`,` {0,3}>`).replace(`code`,`(?: {4}| {0,3}	)[^\\n]`).replace(`fences`," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace(`list`,` {0,3}(?:[*+-]|1[.)])[ \\t]`).replace(`html`,`</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)`).replace(`tag`,_).getRegex(),ce={...y,lheading:te,table:se,paragraph:a(h).replace(`hr`,d).replace(`heading`,` {0,3}#{1,6}(?:\\s|$)`).replace(`|lheading`,``).replace(`table`,se).replace(`blockquote`,` {0,3}>`).replace(`fences`," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace(`list`,` {0,3}(?:[*+-]|1[.)])[ \\t]`).replace(`html`,`</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)`).replace(`tag`,_).getRegex()},le={...y,html:a(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace(`comment`,v).replace(/tag/g,`(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b`).getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:i,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:a(h).replace(`hr`,d).replace(`heading`,` *#{1,6} *[^
]`).replace(`lheading`,m).replace(`|table`,``).replace(`blockquote`,` {0,3}>`).replace(`|fences`,``).replace(`|list`,``).replace(`|html`,``).replace(`|tag`,``).getRegex()},ue=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,de=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,fe=/^( {2,}|\\)\n(?!\s*$)/,pe=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,b=/[\p{P}\p{S}]/u,x=/[\s\p{P}\p{S}]/u,S=/[^\s\p{P}\p{S}]/u,me=a(/^((?![*_])punctSpace)/,`u`).replace(/punctSpace/g,x).getRegex(),C=/(?!~)[\p{P}\p{S}]/u,he=/(?!~)[\s\p{P}\p{S}]/u,ge=/(?:[^\s\p{P}\p{S}]|~)/u,_e=a(/link|precode-code|html/,`g`).replace(`link`,/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace(`precode-`,o?"(?<!`)()":"(^^|[^`])").replace(`code`,/(?<b>`+)[^`]+\k<b>(?!`)/).replace(`html`,/<(?! )[^<>]*?>/).getRegex(),w=/^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/,ve=a(w,`u`).replace(/punct/g,b).getRegex(),ye=a(w,`u`).replace(/punct/g,C).getRegex(),T=`^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)`,be=a(T,`gu`).replace(/notPunctSpace/g,S).replace(/punctSpace/g,x).replace(/punct/g,b).getRegex(),xe=a(T,`gu`).replace(/notPunctSpace/g,ge).replace(/punctSpace/g,he).replace(/punct/g,C).getRegex(),Se=a(`^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)`,`gu`).replace(/notPunctSpace/g,S).replace(/punctSpace/g,x).replace(/punct/g,b).getRegex(),Ce=a(/^~~?(?:((?!~)punct)|[^\s~])/,`u`).replace(/punct/g,b).getRegex(),we=a(`^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)`,`gu`).replace(/notPunctSpace/g,S).replace(/punctSpace/g,x).replace(/punct/g,b).getRegex(),Te=a(/\\(punct)/,`gu`).replace(/punct/g,b).getRegex(),Ee=a(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace(`scheme`,/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace(`email`,/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),De=a(v).replace(`(?:-->|$)`,`-->`).getRegex(),Oe=a(`^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>`).replace(`comment`,De).replace(`attribute`,/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),E=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/,ke=a(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace(`label`,E).replace(`href`,/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace(`title`,/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),D=a(/^!?\[(label)\]\[(ref)\]/).replace(`label`,E).replace(`ref`,g).getRegex(),O=a(/^!?\[(ref)\](?:\[\])?/).replace(`ref`,g).getRegex(),Ae=a(`reflink|nolink(?!\\()`,`g`).replace(`reflink`,D).replace(`nolink`,O).getRegex(),k=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,A={_backpedal:i,anyPunctuation:Te,autolink:Ee,blockSkip:_e,br:fe,code:de,del:i,delLDelim:i,delRDelim:i,emStrongLDelim:ve,emStrongRDelimAst:be,emStrongRDelimUnd:Se,escape:ue,link:ke,nolink:O,punctuation:me,reflink:D,reflinkSearch:Ae,tag:Oe,text:pe,url:i},je={...A,link:a(/^!?\[(label)\]\((.*?)\)/).replace(`label`,E).getRegex(),reflink:a(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace(`label`,E).getRegex()},j={...A,emStrongRDelimAst:xe,emStrongLDelim:ye,delLDelim:Ce,delRDelim:we,url:a(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace(`protocol`,k).replace(`email`,/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:a(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace(`protocol`,k).getRegex()},Me={...j,br:a(fe).replace(`{2,}`,`*`).getRegex(),text:a(j.text).replace(`\\b_`,`\\b_| {2,}\\n`).replace(/\{2,\}/g,`*`).getRegex()},M={normal:y,gfm:ce,pedantic:le},N={normal:A,gfm:j,breaks:Me,pedantic:je},Ne={"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`},P=e=>Ne[e];function F(e,t){if(t){if(s.escapeTest.test(e))return e.replace(s.escapeReplace,P)}else if(s.escapeTestNoEncode.test(e))return e.replace(s.escapeReplaceNoEncode,P);return e}function I(e){try{e=encodeURI(e).replace(s.percentDecode,`%`)}catch{return null}return e}function L(e,t){let n=e.replace(s.findPipe,(e,t,n)=>{let r=!1,i=t;for(;--i>=0&&n[i]===`\\`;)r=!r;return r?`|`:` |`}).split(s.splitPipe),r=0;if(n[0].trim()||n.shift(),n.length>0&&!n.at(-1)?.trim()&&n.pop(),t)if(n.length>t)n.splice(t);else for(;n.length<t;)n.push(``);for(;r<n.length;r++)n[r]=n[r].trim().replace(s.slashPipe,`|`);return n}function R(e,t,n){let r=e.length;if(r===0)return``;let i=0;for(;i<r;){let a=e.charAt(r-i-1);if(a===t&&!n)i++;else if(a!==t&&n)i++;else break}return e.slice(0,r-i)}function Pe(e,t){if(e.indexOf(t[1])===-1)return-1;let n=0;for(let r=0;r<e.length;r++)if(e[r]===`\\`)r++;else if(e[r]===t[0])n++;else if(e[r]===t[1]&&(n--,n<0))return r;return n>0?-2:-1}function Fe(e,t=0){let n=t,r=``;for(let t of e)if(t===`	`){let e=4-n%4;r+=` `.repeat(e),n+=e}else r+=t,n++;return r}function z(e,t,n,r,i){let a=t.href,o=t.title||null,s=e[1].replace(i.other.outputLinkReplace,`$1`);r.state.inLink=!0;let c={type:e[0].charAt(0)===`!`?`image`:`link`,raw:n,href:a,title:o,text:s,tokens:r.inlineTokens(s)};return r.state.inLink=!1,c}function Ie(e,t,n){let r=e.match(n.other.indentCodeCompensation);if(r===null)return t;let i=r[1];return t.split(`
`).map(e=>{let t=e.match(n.other.beginningSpace);if(t===null)return e;let[r]=t;return r.length>=i.length?e.slice(i.length):e}).join(`
`)}var B=class{options;rules;lexer;constructor(e){this.options=e||n}space(e){let t=this.rules.block.newline.exec(e);if(t&&t[0].length>0)return{type:`space`,raw:t[0]}}code(e){let t=this.rules.block.code.exec(e);if(t){let e=t[0].replace(this.rules.other.codeRemoveIndent,``);return{type:`code`,raw:t[0],codeBlockStyle:`indented`,text:this.options.pedantic?e:R(e,`
`)}}}fences(e){let t=this.rules.block.fences.exec(e);if(t){let e=t[0],n=Ie(e,t[3]||``,this.rules);return{type:`code`,raw:e,lang:t[2]?t[2].trim().replace(this.rules.inline.anyPunctuation,`$1`):t[2],text:n}}}heading(e){let t=this.rules.block.heading.exec(e);if(t){let e=t[2].trim();if(this.rules.other.endingHash.test(e)){let t=R(e,`#`);(this.options.pedantic||!t||this.rules.other.endingSpaceChar.test(t))&&(e=t.trim())}return{type:`heading`,raw:t[0],depth:t[1].length,text:e,tokens:this.lexer.inline(e)}}}hr(e){let t=this.rules.block.hr.exec(e);if(t)return{type:`hr`,raw:R(t[0],`
`)}}blockquote(e){let t=this.rules.block.blockquote.exec(e);if(t){let e=R(t[0],`
`).split(`
`),n=``,r=``,i=[];for(;e.length>0;){let t=!1,a=[],o;for(o=0;o<e.length;o++)if(this.rules.other.blockquoteStart.test(e[o]))a.push(e[o]),t=!0;else if(!t)a.push(e[o]);else break;e=e.slice(o);let s=a.join(`
`),c=s.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,``);n=n?`${n}
${s}`:s,r=r?`${r}
${c}`:c;let l=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(c,i,!0),this.lexer.state.top=l,e.length===0)break;let u=i.at(-1);if(u?.type===`code`)break;if(u?.type===`blockquote`){let t=u,a=t.raw+`
`+e.join(`
`),o=this.blockquote(a);i[i.length-1]=o,n=n.substring(0,n.length-t.raw.length)+o.raw,r=r.substring(0,r.length-t.text.length)+o.text;break}else if(u?.type===`list`){let t=u,a=t.raw+`
`+e.join(`
`),o=this.list(a);i[i.length-1]=o,n=n.substring(0,n.length-u.raw.length)+o.raw,r=r.substring(0,r.length-t.raw.length)+o.raw,e=a.substring(i.at(-1).raw.length).split(`
`);continue}}return{type:`blockquote`,raw:n,tokens:i,text:r}}}list(e){let t=this.rules.block.list.exec(e);if(t){let n=t[1].trim(),r=n.length>1,i={type:`list`,raw:``,ordered:r,start:r?+n.slice(0,-1):``,loose:!1,items:[]};n=r?`\\d{1,9}\\${n.slice(-1)}`:`\\${n}`,this.options.pedantic&&(n=r?n:`[*+-]`);let a=this.rules.other.listItemRegex(n),o=!1;for(;e;){let n=!1,r=``,s=``;if(!(t=a.exec(e))||this.rules.block.hr.test(e))break;r=t[0],e=e.substring(r.length);let c=Fe(t[2].split(`
`,1)[0],t[1].length),l=e.split(`
`,1)[0],u=!c.trim(),d=0;if(this.options.pedantic?(d=2,s=c.trimStart()):u?d=t[1].length+1:(d=c.search(this.rules.other.nonSpaceChar),d=d>4?1:d,s=c.slice(d),d+=t[1].length),u&&this.rules.other.blankLine.test(l)&&(r+=l+`
`,e=e.substring(l.length+1),n=!0),!n){let t=this.rules.other.nextBulletRegex(d),n=this.rules.other.hrRegex(d),i=this.rules.other.fencesBeginRegex(d),a=this.rules.other.headingBeginRegex(d),o=this.rules.other.htmlBeginRegex(d),ee=this.rules.other.blockquoteBeginRegex(d);for(;e;){let f=e.split(`
`,1)[0],p;if(l=f,this.options.pedantic?(l=l.replace(this.rules.other.listReplaceNesting,`  `),p=l):p=l.replace(this.rules.other.tabCharGlobal,`    `),i.test(l)||a.test(l)||o.test(l)||ee.test(l)||t.test(l)||n.test(l))break;if(p.search(this.rules.other.nonSpaceChar)>=d||!l.trim())s+=`
`+p.slice(d);else{if(u||c.replace(this.rules.other.tabCharGlobal,`    `).search(this.rules.other.nonSpaceChar)>=4||i.test(c)||a.test(c)||n.test(c))break;s+=`
`+l}u=!l.trim(),r+=f+`
`,e=e.substring(f.length+1),c=p.slice(d)}}i.loose||(o?i.loose=!0:this.rules.other.doubleBlankLine.test(r)&&(o=!0)),i.items.push({type:`list_item`,raw:r,task:!!this.options.gfm&&this.rules.other.listIsTask.test(s),loose:!1,text:s,tokens:[]}),i.raw+=r}let s=i.items.at(-1);if(s)s.raw=s.raw.trimEnd(),s.text=s.text.trimEnd();else return;i.raw=i.raw.trimEnd();for(let e of i.items){if(this.lexer.state.top=!1,e.tokens=this.lexer.blockTokens(e.text,[]),e.task){if(e.text=e.text.replace(this.rules.other.listReplaceTask,``),e.tokens[0]?.type===`text`||e.tokens[0]?.type===`paragraph`){e.tokens[0].raw=e.tokens[0].raw.replace(this.rules.other.listReplaceTask,``),e.tokens[0].text=e.tokens[0].text.replace(this.rules.other.listReplaceTask,``);for(let e=this.lexer.inlineQueue.length-1;e>=0;e--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[e].src)){this.lexer.inlineQueue[e].src=this.lexer.inlineQueue[e].src.replace(this.rules.other.listReplaceTask,``);break}}let t=this.rules.other.listTaskCheckbox.exec(e.raw);if(t){let n={type:`checkbox`,raw:t[0]+` `,checked:t[0]!==`[ ]`};e.checked=n.checked,i.loose?e.tokens[0]&&[`paragraph`,`text`].includes(e.tokens[0].type)&&`tokens`in e.tokens[0]&&e.tokens[0].tokens?(e.tokens[0].raw=n.raw+e.tokens[0].raw,e.tokens[0].text=n.raw+e.tokens[0].text,e.tokens[0].tokens.unshift(n)):e.tokens.unshift({type:`paragraph`,raw:n.raw,text:n.raw,tokens:[n]}):e.tokens.unshift(n)}}if(!i.loose){let t=e.tokens.filter(e=>e.type===`space`);i.loose=t.length>0&&t.some(e=>this.rules.other.anyLine.test(e.raw))}}if(i.loose)for(let e of i.items){e.loose=!0;for(let t of e.tokens)t.type===`text`&&(t.type=`paragraph`)}return i}}html(e){let t=this.rules.block.html.exec(e);if(t)return{type:`html`,block:!0,raw:t[0],pre:t[1]===`pre`||t[1]===`script`||t[1]===`style`,text:t[0]}}def(e){let t=this.rules.block.def.exec(e);if(t){let e=t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal,` `),n=t[2]?t[2].replace(this.rules.other.hrefBrackets,`$1`).replace(this.rules.inline.anyPunctuation,`$1`):``,r=t[3]?t[3].substring(1,t[3].length-1).replace(this.rules.inline.anyPunctuation,`$1`):t[3];return{type:`def`,tag:e,raw:t[0],href:n,title:r}}}table(e){let t=this.rules.block.table.exec(e);if(!t||!this.rules.other.tableDelimiter.test(t[2]))return;let n=L(t[1]),r=t[2].replace(this.rules.other.tableAlignChars,``).split(`|`),i=t[3]?.trim()?t[3].replace(this.rules.other.tableRowBlankLine,``).split(`
`):[],a={type:`table`,raw:t[0],header:[],align:[],rows:[]};if(n.length===r.length){for(let e of r)this.rules.other.tableAlignRight.test(e)?a.align.push(`right`):this.rules.other.tableAlignCenter.test(e)?a.align.push(`center`):this.rules.other.tableAlignLeft.test(e)?a.align.push(`left`):a.align.push(null);for(let e=0;e<n.length;e++)a.header.push({text:n[e],tokens:this.lexer.inline(n[e]),header:!0,align:a.align[e]});for(let e of i)a.rows.push(L(e,a.header.length).map((e,t)=>({text:e,tokens:this.lexer.inline(e),header:!1,align:a.align[t]})));return a}}lheading(e){let t=this.rules.block.lheading.exec(e);if(t){let e=t[1].trim();return{type:`heading`,raw:t[0],depth:t[2].charAt(0)===`=`?1:2,text:e,tokens:this.lexer.inline(e)}}}paragraph(e){let t=this.rules.block.paragraph.exec(e);if(t){let e=t[1].charAt(t[1].length-1)===`
`?t[1].slice(0,-1):t[1];return{type:`paragraph`,raw:t[0],text:e,tokens:this.lexer.inline(e)}}}text(e){let t=this.rules.block.text.exec(e);if(t)return{type:`text`,raw:t[0],text:t[0],tokens:this.lexer.inline(t[0])}}escape(e){let t=this.rules.inline.escape.exec(e);if(t)return{type:`escape`,raw:t[0],text:t[1]}}tag(e){let t=this.rules.inline.tag.exec(e);if(t)return!this.lexer.state.inLink&&this.rules.other.startATag.test(t[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(t[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(t[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(t[0])&&(this.lexer.state.inRawBlock=!1),{type:`html`,raw:t[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:t[0]}}link(e){let t=this.rules.inline.link.exec(e);if(t){let e=t[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(e)){if(!this.rules.other.endAngleBracket.test(e))return;let t=R(e.slice(0,-1),`\\`);if((e.length-t.length)%2==0)return}else{let e=Pe(t[2],`()`);if(e===-2)return;if(e>-1){let n=(t[0].indexOf(`!`)===0?5:4)+t[1].length+e;t[2]=t[2].substring(0,e),t[0]=t[0].substring(0,n).trim(),t[3]=``}}let n=t[2],r=``;if(this.options.pedantic){let e=this.rules.other.pedanticHrefTitle.exec(n);e&&(n=e[1],r=e[3])}else r=t[3]?t[3].slice(1,-1):``;return n=n.trim(),this.rules.other.startAngleBracket.test(n)&&(n=this.options.pedantic&&!this.rules.other.endAngleBracket.test(e)?n.slice(1):n.slice(1,-1)),z(t,{href:n&&n.replace(this.rules.inline.anyPunctuation,`$1`),title:r&&r.replace(this.rules.inline.anyPunctuation,`$1`)},t[0],this.lexer,this.rules)}}reflink(e,t){let n;if((n=this.rules.inline.reflink.exec(e))||(n=this.rules.inline.nolink.exec(e))){let e=t[(n[2]||n[1]).replace(this.rules.other.multipleSpaceGlobal,` `).toLowerCase()];if(!e){let e=n[0].charAt(0);return{type:`text`,raw:e,text:e}}return z(n,e,n[0],this.lexer,this.rules)}}emStrong(e,t,n=``){let r=this.rules.inline.emStrongLDelim.exec(e);if(!(!r||!r[1]&&!r[2]&&!r[3]&&!r[4]||r[4]&&n.match(this.rules.other.unicodeAlphaNumeric))&&(!(r[1]||r[3])||!n||this.rules.inline.punctuation.exec(n))){let n=[...r[0]].length-1,i,a,o=n,s=0,c=r[0][0]===`*`?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(c.lastIndex=0,t=t.slice(-1*e.length+n);(r=c.exec(t))!=null;){if(i=r[1]||r[2]||r[3]||r[4]||r[5]||r[6],!i)continue;if(a=[...i].length,r[3]||r[4]){o+=a;continue}else if((r[5]||r[6])&&n%3&&!((n+a)%3)){s+=a;continue}if(o-=a,o>0)continue;a=Math.min(a,a+o+s);let t=[...r[0]][0].length,c=e.slice(0,n+r.index+t+a);if(Math.min(n,a)%2){let e=c.slice(1,-1);return{type:`em`,raw:c,text:e,tokens:this.lexer.inlineTokens(e)}}let l=c.slice(2,-2);return{type:`strong`,raw:c,text:l,tokens:this.lexer.inlineTokens(l)}}}}codespan(e){let t=this.rules.inline.code.exec(e);if(t){let e=t[2].replace(this.rules.other.newLineCharGlobal,` `),n=this.rules.other.nonSpaceChar.test(e),r=this.rules.other.startingSpaceChar.test(e)&&this.rules.other.endingSpaceChar.test(e);return n&&r&&(e=e.substring(1,e.length-1)),{type:`codespan`,raw:t[0],text:e}}}br(e){let t=this.rules.inline.br.exec(e);if(t)return{type:`br`,raw:t[0]}}del(e,t,n=``){let r=this.rules.inline.delLDelim.exec(e);if(r&&(!r[1]||!n||this.rules.inline.punctuation.exec(n))){let n=[...r[0]].length-1,i,a,o=n,s=this.rules.inline.delRDelim;for(s.lastIndex=0,t=t.slice(-1*e.length+n);(r=s.exec(t))!=null;){if(i=r[1]||r[2]||r[3]||r[4]||r[5]||r[6],!i||(a=[...i].length,a!==n))continue;if(r[3]||r[4]){o+=a;continue}if(o-=a,o>0)continue;a=Math.min(a,a+o);let t=[...r[0]][0].length,s=e.slice(0,n+r.index+t+a),c=s.slice(n,-n);return{type:`del`,raw:s,text:c,tokens:this.lexer.inlineTokens(c)}}}}autolink(e){let t=this.rules.inline.autolink.exec(e);if(t){let e,n;return t[2]===`@`?(e=t[1],n=`mailto:`+e):(e=t[1],n=e),{type:`link`,raw:t[0],text:e,href:n,tokens:[{type:`text`,raw:e,text:e}]}}}url(e){let t;if(t=this.rules.inline.url.exec(e)){let e,n;if(t[2]===`@`)e=t[0],n=`mailto:`+e;else{let r;do r=t[0],t[0]=this.rules.inline._backpedal.exec(t[0])?.[0]??``;while(r!==t[0]);e=t[0],n=t[1]===`www.`?`http://`+t[0]:t[0]}return{type:`link`,raw:t[0],text:e,href:n,tokens:[{type:`text`,raw:e,text:e}]}}}inlineText(e){let t=this.rules.inline.text.exec(e);if(t){let e=this.lexer.state.inRawBlock;return{type:`text`,raw:t[0],text:t[0],escaped:e}}}},V=class e{tokens;options;state;inlineQueue;tokenizer;constructor(e){this.tokens=[],this.tokens.links=Object.create(null),this.options=e||n,this.options.tokenizer=this.options.tokenizer||new B,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let t={other:s,block:M.normal,inline:N.normal};this.options.pedantic?(t.block=M.pedantic,t.inline=N.pedantic):this.options.gfm&&(t.block=M.gfm,this.options.breaks?t.inline=N.breaks:t.inline=N.gfm),this.tokenizer.rules=t}static get rules(){return{block:M,inline:N}}static lex(t,n){return new e(n).lex(t)}static lexInline(t,n){return new e(n).inlineTokens(t)}lex(e){e=e.replace(s.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let e=0;e<this.inlineQueue.length;e++){let t=this.inlineQueue[e];this.inlineTokens(t.src,t.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,t=[],n=!1){for(this.tokenizer.lexer=this,this.options.pedantic&&(e=e.replace(s.tabCharGlobal,`    `).replace(s.spaceLine,``));e;){let r;if(this.options.extensions?.block?.some(n=>(r=n.call({lexer:this},e,t))?(e=e.substring(r.raw.length),t.push(r),!0):!1))continue;if(r=this.tokenizer.space(e)){e=e.substring(r.raw.length);let n=t.at(-1);r.raw.length===1&&n!==void 0?n.raw+=`
`:t.push(r);continue}if(r=this.tokenizer.code(e)){e=e.substring(r.raw.length);let n=t.at(-1);n?.type===`paragraph`||n?.type===`text`?(n.raw+=(n.raw.endsWith(`
`)?``:`
`)+r.raw,n.text+=`
`+r.text,this.inlineQueue.at(-1).src=n.text):t.push(r);continue}if(r=this.tokenizer.fences(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.heading(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.hr(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.blockquote(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.list(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.html(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.def(e)){e=e.substring(r.raw.length);let n=t.at(-1);n?.type===`paragraph`||n?.type===`text`?(n.raw+=(n.raw.endsWith(`
`)?``:`
`)+r.raw,n.text+=`
`+r.raw,this.inlineQueue.at(-1).src=n.text):this.tokens.links[r.tag]||(this.tokens.links[r.tag]={href:r.href,title:r.title},t.push(r));continue}if(r=this.tokenizer.table(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.lheading(e)){e=e.substring(r.raw.length),t.push(r);continue}let i=e;if(this.options.extensions?.startBlock){let t=1/0,n=e.slice(1),r;this.options.extensions.startBlock.forEach(e=>{r=e.call({lexer:this},n),typeof r==`number`&&r>=0&&(t=Math.min(t,r))}),t<1/0&&t>=0&&(i=e.substring(0,t+1))}if(this.state.top&&(r=this.tokenizer.paragraph(i))){let a=t.at(-1);n&&a?.type===`paragraph`?(a.raw+=(a.raw.endsWith(`
`)?``:`
`)+r.raw,a.text+=`
`+r.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=a.text):t.push(r),n=i.length!==e.length,e=e.substring(r.raw.length);continue}if(r=this.tokenizer.text(e)){e=e.substring(r.raw.length);let n=t.at(-1);n?.type===`text`?(n.raw+=(n.raw.endsWith(`
`)?``:`
`)+r.raw,n.text+=`
`+r.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=n.text):t.push(r);continue}if(e){let t=`Infinite loop on byte: `+e.charCodeAt(0);if(this.options.silent){console.error(t);break}else throw Error(t)}}return this.state.top=!0,t}inline(e,t=[]){return this.inlineQueue.push({src:e,tokens:t}),t}inlineTokens(e,t=[]){this.tokenizer.lexer=this;let n=e,r=null;if(this.tokens.links){let e=Object.keys(this.tokens.links);if(e.length>0)for(;(r=this.tokenizer.rules.inline.reflinkSearch.exec(n))!=null;)e.includes(r[0].slice(r[0].lastIndexOf(`[`)+1,-1))&&(n=n.slice(0,r.index)+`[`+`a`.repeat(r[0].length-2)+`]`+n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(r=this.tokenizer.rules.inline.anyPunctuation.exec(n))!=null;)n=n.slice(0,r.index)+`++`+n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let i;for(;(r=this.tokenizer.rules.inline.blockSkip.exec(n))!=null;)i=r[2]?r[2].length:0,n=n.slice(0,r.index+i)+`[`+`a`.repeat(r[0].length-i-2)+`]`+n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);n=this.options.hooks?.emStrongMask?.call({lexer:this},n)??n;let a=!1,o=``;for(;e;){a||(o=``),a=!1;let r;if(this.options.extensions?.inline?.some(n=>(r=n.call({lexer:this},e,t))?(e=e.substring(r.raw.length),t.push(r),!0):!1))continue;if(r=this.tokenizer.escape(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.tag(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.link(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(r.raw.length);let n=t.at(-1);r.type===`text`&&n?.type===`text`?(n.raw+=r.raw,n.text+=r.text):t.push(r);continue}if(r=this.tokenizer.emStrong(e,n,o)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.codespan(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.br(e)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.del(e,n,o)){e=e.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.autolink(e)){e=e.substring(r.raw.length),t.push(r);continue}if(!this.state.inLink&&(r=this.tokenizer.url(e))){e=e.substring(r.raw.length),t.push(r);continue}let i=e;if(this.options.extensions?.startInline){let t=1/0,n=e.slice(1),r;this.options.extensions.startInline.forEach(e=>{r=e.call({lexer:this},n),typeof r==`number`&&r>=0&&(t=Math.min(t,r))}),t<1/0&&t>=0&&(i=e.substring(0,t+1))}if(r=this.tokenizer.inlineText(i)){e=e.substring(r.raw.length),r.raw.slice(-1)!==`_`&&(o=r.raw.slice(-1)),a=!0;let n=t.at(-1);n?.type===`text`?(n.raw+=r.raw,n.text+=r.text):t.push(r);continue}if(e){let t=`Infinite loop on byte: `+e.charCodeAt(0);if(this.options.silent){console.error(t);break}else throw Error(t)}}return t}},H=class{options;parser;constructor(e){this.options=e||n}space(e){return``}code({text:e,lang:t,escaped:n}){let r=(t||``).match(s.notSpaceStart)?.[0],i=e.replace(s.endingNewline,``)+`
`;return r?`<pre><code class="language-`+F(r)+`">`+(n?i:F(i,!0))+`</code></pre>
`:`<pre><code>`+(n?i:F(i,!0))+`</code></pre>
`}blockquote({tokens:e}){return`<blockquote>
${this.parser.parse(e)}</blockquote>
`}html({text:e}){return e}def(e){return``}heading({tokens:e,depth:t}){return`<h${t}>${this.parser.parseInline(e)}</h${t}>
`}hr(e){return`<hr>
`}list(e){let t=e.ordered,n=e.start,r=``;for(let t=0;t<e.items.length;t++){let n=e.items[t];r+=this.listitem(n)}let i=t?`ol`:`ul`,a=t&&n!==1?` start="`+n+`"`:``;return`<`+i+a+`>
`+r+`</`+i+`>
`}listitem(e){return`<li>${this.parser.parse(e.tokens)}</li>
`}checkbox({checked:e}){return`<input `+(e?`checked="" `:``)+`disabled="" type="checkbox"> `}paragraph({tokens:e}){return`<p>${this.parser.parseInline(e)}</p>
`}table(e){let t=``,n=``;for(let t=0;t<e.header.length;t++)n+=this.tablecell(e.header[t]);t+=this.tablerow({text:n});let r=``;for(let t=0;t<e.rows.length;t++){let i=e.rows[t];n=``;for(let e=0;e<i.length;e++)n+=this.tablecell(i[e]);r+=this.tablerow({text:n})}return r&&=`<tbody>${r}</tbody>`,`<table>
<thead>
`+t+`</thead>
`+r+`</table>
`}tablerow({text:e}){return`<tr>
${e}</tr>
`}tablecell(e){let t=this.parser.parseInline(e.tokens),n=e.header?`th`:`td`;return(e.align?`<${n} align="${e.align}">`:`<${n}>`)+t+`</${n}>
`}strong({tokens:e}){return`<strong>${this.parser.parseInline(e)}</strong>`}em({tokens:e}){return`<em>${this.parser.parseInline(e)}</em>`}codespan({text:e}){return`<code>${F(e,!0)}</code>`}br(e){return`<br>`}del({tokens:e}){return`<del>${this.parser.parseInline(e)}</del>`}link({href:e,title:t,tokens:n}){let r=this.parser.parseInline(n),i=I(e);if(i===null)return r;e=i;let a=`<a href="`+e+`"`;return t&&(a+=` title="`+F(t)+`"`),a+=`>`+r+`</a>`,a}image({href:e,title:t,text:n,tokens:r}){r&&(n=this.parser.parseInline(r,this.parser.textRenderer));let i=I(e);if(i===null)return F(n);e=i;let a=`<img src="${e}" alt="${F(n)}"`;return t&&(a+=` title="${F(t)}"`),a+=`>`,a}text(e){return`tokens`in e&&e.tokens?this.parser.parseInline(e.tokens):`escaped`in e&&e.escaped?e.text:F(e.text)}},U=class{strong({text:e}){return e}em({text:e}){return e}codespan({text:e}){return e}del({text:e}){return e}html({text:e}){return e}text({text:e}){return e}link({text:e}){return``+e}image({text:e}){return``+e}br(){return``}checkbox({raw:e}){return e}},W=class e{options;renderer;textRenderer;constructor(e){this.options=e||n,this.options.renderer=this.options.renderer||new H,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new U}static parse(t,n){return new e(n).parse(t)}static parseInline(t,n){return new e(n).parseInline(t)}parse(e){this.renderer.parser=this;let t=``;for(let n=0;n<e.length;n++){let r=e[n];if(this.options.extensions?.renderers?.[r.type]){let e=r,n=this.options.extensions.renderers[e.type].call({parser:this},e);if(n!==!1||![`space`,`hr`,`heading`,`code`,`table`,`blockquote`,`list`,`html`,`def`,`paragraph`,`text`].includes(e.type)){t+=n||``;continue}}let i=r;switch(i.type){case`space`:t+=this.renderer.space(i);break;case`hr`:t+=this.renderer.hr(i);break;case`heading`:t+=this.renderer.heading(i);break;case`code`:t+=this.renderer.code(i);break;case`table`:t+=this.renderer.table(i);break;case`blockquote`:t+=this.renderer.blockquote(i);break;case`list`:t+=this.renderer.list(i);break;case`checkbox`:t+=this.renderer.checkbox(i);break;case`html`:t+=this.renderer.html(i);break;case`def`:t+=this.renderer.def(i);break;case`paragraph`:t+=this.renderer.paragraph(i);break;case`text`:t+=this.renderer.text(i);break;default:{let e=`Token with "`+i.type+`" type was not found.`;if(this.options.silent)return console.error(e),``;throw Error(e)}}}return t}parseInline(e,t=this.renderer){this.renderer.parser=this;let n=``;for(let r=0;r<e.length;r++){let i=e[r];if(this.options.extensions?.renderers?.[i.type]){let e=this.options.extensions.renderers[i.type].call({parser:this},i);if(e!==!1||![`escape`,`html`,`link`,`image`,`strong`,`em`,`codespan`,`br`,`del`,`text`].includes(i.type)){n+=e||``;continue}}let a=i;switch(a.type){case`escape`:n+=t.text(a);break;case`html`:n+=t.html(a);break;case`link`:n+=t.link(a);break;case`image`:n+=t.image(a);break;case`checkbox`:n+=t.checkbox(a);break;case`strong`:n+=t.strong(a);break;case`em`:n+=t.em(a);break;case`codespan`:n+=t.codespan(a);break;case`br`:n+=t.br(a);break;case`del`:n+=t.del(a);break;case`text`:n+=t.text(a);break;default:{let e=`Token with "`+a.type+`" type was not found.`;if(this.options.silent)return console.error(e),``;throw Error(e)}}}return n}},G=class{options;block;constructor(e){this.options=e||n}static passThroughHooks=new Set([`preprocess`,`postprocess`,`processAllTokens`,`emStrongMask`]);static passThroughHooksRespectAsync=new Set([`preprocess`,`postprocess`,`processAllTokens`]);preprocess(e){return e}postprocess(e){return e}processAllTokens(e){return e}emStrongMask(e){return e}provideLexer(){return this.block?V.lex:V.lexInline}provideParser(){return this.block?W.parse:W.parseInline}},K=new class{defaults=t();options=this.setOptions;parse=this.parseMarkdown(!0);parseInline=this.parseMarkdown(!1);Parser=W;Renderer=H;TextRenderer=U;Lexer=V;Tokenizer=B;Hooks=G;constructor(...e){this.use(...e)}walkTokens(e,t){let n=[];for(let r of e)switch(n=n.concat(t.call(this,r)),r.type){case`table`:{let e=r;for(let r of e.header)n=n.concat(this.walkTokens(r.tokens,t));for(let r of e.rows)for(let e of r)n=n.concat(this.walkTokens(e.tokens,t));break}case`list`:{let e=r;n=n.concat(this.walkTokens(e.items,t));break}default:{let e=r;this.defaults.extensions?.childTokens?.[e.type]?this.defaults.extensions.childTokens[e.type].forEach(r=>{let i=e[r].flat(1/0);n=n.concat(this.walkTokens(i,t))}):e.tokens&&(n=n.concat(this.walkTokens(e.tokens,t)))}}return n}use(...e){let t=this.defaults.extensions||{renderers:{},childTokens:{}};return e.forEach(e=>{let n={...e};if(n.async=this.defaults.async||n.async||!1,e.extensions&&(e.extensions.forEach(e=>{if(!e.name)throw Error(`extension name required`);if(`renderer`in e){let n=t.renderers[e.name];n?t.renderers[e.name]=function(...t){let r=e.renderer.apply(this,t);return r===!1&&(r=n.apply(this,t)),r}:t.renderers[e.name]=e.renderer}if(`tokenizer`in e){if(!e.level||e.level!==`block`&&e.level!==`inline`)throw Error(`extension level must be 'block' or 'inline'`);let n=t[e.level];n?n.unshift(e.tokenizer):t[e.level]=[e.tokenizer],e.start&&(e.level===`block`?t.startBlock?t.startBlock.push(e.start):t.startBlock=[e.start]:e.level===`inline`&&(t.startInline?t.startInline.push(e.start):t.startInline=[e.start]))}`childTokens`in e&&e.childTokens&&(t.childTokens[e.name]=e.childTokens)}),n.extensions=t),e.renderer){let t=this.defaults.renderer||new H(this.defaults);for(let n in e.renderer){if(!(n in t))throw Error(`renderer '${n}' does not exist`);if([`options`,`parser`].includes(n))continue;let r=n,i=e.renderer[r],a=t[r];t[r]=(...e)=>{let n=i.apply(t,e);return n===!1&&(n=a.apply(t,e)),n||``}}n.renderer=t}if(e.tokenizer){let t=this.defaults.tokenizer||new B(this.defaults);for(let n in e.tokenizer){if(!(n in t))throw Error(`tokenizer '${n}' does not exist`);if([`options`,`rules`,`lexer`].includes(n))continue;let r=n,i=e.tokenizer[r],a=t[r];t[r]=(...e)=>{let n=i.apply(t,e);return n===!1&&(n=a.apply(t,e)),n}}n.tokenizer=t}if(e.hooks){let t=this.defaults.hooks||new G;for(let n in e.hooks){if(!(n in t))throw Error(`hook '${n}' does not exist`);if([`options`,`block`].includes(n))continue;let r=n,i=e.hooks[r],a=t[r];G.passThroughHooks.has(n)?t[r]=e=>{if(this.defaults.async&&G.passThroughHooksRespectAsync.has(n))return(async()=>{let n=await i.call(t,e);return a.call(t,n)})();let r=i.call(t,e);return a.call(t,r)}:t[r]=(...e)=>{if(this.defaults.async)return(async()=>{let n=await i.apply(t,e);return n===!1&&(n=await a.apply(t,e)),n})();let n=i.apply(t,e);return n===!1&&(n=a.apply(t,e)),n}}n.hooks=t}if(e.walkTokens){let t=this.defaults.walkTokens,r=e.walkTokens;n.walkTokens=function(e){let n=[];return n.push(r.call(this,e)),t&&(n=n.concat(t.call(this,e))),n}}this.defaults={...this.defaults,...n}}),this}setOptions(e){return this.defaults={...this.defaults,...e},this}lexer(e,t){return V.lex(e,t??this.defaults)}parser(e,t){return W.parse(e,t??this.defaults)}parseMarkdown(e){return(t,n)=>{let r={...n},i={...this.defaults,...r},a=this.onError(!!i.silent,!!i.async);if(this.defaults.async===!0&&r.async===!1)return a(Error(`marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise.`));if(typeof t>`u`||t===null)return a(Error(`marked(): input parameter is undefined or null`));if(typeof t!=`string`)return a(Error(`marked(): input parameter is of type `+Object.prototype.toString.call(t)+`, string expected`));if(i.hooks&&(i.hooks.options=i,i.hooks.block=e),i.async)return(async()=>{let n=i.hooks?await i.hooks.preprocess(t):t,r=await(i.hooks?await i.hooks.provideLexer():e?V.lex:V.lexInline)(n,i),a=i.hooks?await i.hooks.processAllTokens(r):r;i.walkTokens&&await Promise.all(this.walkTokens(a,i.walkTokens));let o=await(i.hooks?await i.hooks.provideParser():e?W.parse:W.parseInline)(a,i);return i.hooks?await i.hooks.postprocess(o):o})().catch(a);try{i.hooks&&(t=i.hooks.preprocess(t));let n=(i.hooks?i.hooks.provideLexer():e?V.lex:V.lexInline)(t,i);i.hooks&&(n=i.hooks.processAllTokens(n)),i.walkTokens&&this.walkTokens(n,i.walkTokens);let r=(i.hooks?i.hooks.provideParser():e?W.parse:W.parseInline)(n,i);return i.hooks&&(r=i.hooks.postprocess(r)),r}catch(e){return a(e)}}}onError(e,t){return n=>{if(n.message+=`
Please report this to https://github.com/markedjs/marked.`,e){let e=`<p>An error occurred:</p><pre>`+F(n.message+``,!0)+`</pre>`;return t?Promise.resolve(e):e}if(t)return Promise.reject(n);throw n}}};function q(e,t){return K.parse(e,t)}q.options=q.setOptions=function(e){return K.setOptions(e),q.defaults=K.defaults,r(q.defaults),q},q.getDefaults=t,q.defaults=n,q.use=function(...e){return K.use(...e),q.defaults=K.defaults,r(q.defaults),q},q.walkTokens=function(e,t){return K.walkTokens(e,t)},q.parseInline=K.parseInline,q.Parser=W,q.parser=W.parse,q.Renderer=H,q.TextRenderer=U,q.Lexer=V,q.lexer=V.lex,q.Tokenizer=B,q.Hooks=G,q.parse=q,q.options,q.setOptions,q.use,q.walkTokens,q.parseInline,W.parse,V.lex,q.setOptions({breaks:!0,gfm:!0});var J={workspaces:[],selectedWorkspaceId:null,messages:[],stage:`IDLE`,currentStep:0,totalSteps:0,scope:null,charts:[],reports:[],logs:[],activeTab:`scope`,isAnalyzing:!1,connectionStatus:`disconnected`};function Le(){let e=document.getElementById(`app`);e.innerHTML=`
    <div class="container">
      <!-- 左侧边栏 - 工作区列表 -->
      <aside class="sidebar-left">
        <div class="sidebar-header">
          <h2>工作区</h2>
          <button class="btn-new" id="btn-new-workspace" title="新建工作区">+</button>
        </div>
        <div class="workspace-list" id="workspace-list">
          <div class="loading">加载中...</div>
        </div>
      </aside>

      <!-- 中间区域 - 对话 -->
      <main class="chat-area">
        <div class="chat-header">
          <div class="connection-status" id="connection-status">
            <span class="status-dot"></span>
            <span class="status-text">连接中...</span>
          </div>
          <div class="stage-indicator" id="stage-indicator"></div>
        </div>

        <div class="message-list" id="message-list">
          <div class="welcome-message">
            <h3>欢迎使用 Sherblock</h3>
            <p>区块链交易行为分析 Agent</p>
            <p class="hint">请从左侧选择一个工作区，或创建新工作区开始分析</p>
          </div>
        </div>

        <div class="input-area">
          <div class="input-wrapper">
            <textarea
              id="message-input"
              placeholder="输入您要分析的区块链地址或交易hash..."
              rows="3"
              disabled
            ></textarea>
            <button class="btn-send" id="btn-send" disabled>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
          <div class="input-hint">
            <span>Enter 发送, Shift+Enter 换行</span>
          </div>
        </div>
      </main>

      <!-- 右侧边栏 - 工作区详情 -->
      <aside class="sidebar-right">
        <div class="details-header">
          <h3>工作区详情</h3>
        </div>
        <div class="tabs" id="detail-tabs">
          <button class="tab active" data-tab="scope">Scope</button>
          <button class="tab" data-tab="charts">Charts</button>
          <button class="tab" data-tab="reports">Reports</button>
          <button class="tab" data-tab="logs">Logs</button>
        </div>
        <div class="detail-content" id="detail-content">
          <div class="empty-detail">
            <p>选择一个工作区查看详情</p>
          </div>
        </div>
      </aside>
    </div>
  `,Re()}function Re(){let e=document.createElement(`style`);e.textContent=`
    .container {
      display: flex;
      height: 100vh;
      background: #0d0d0d;
    }

    /* 左侧边栏 */
    .sidebar-left {
      width: 280px;
      min-width: 280px;
      background: #171717;
      border-right: 1px solid #2a2a2a;
      display: flex;
      flex-direction: column;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #2a2a2a;
    }

    .sidebar-header h2 {
      font-size: 16px;
      font-weight: 600;
      color: #e5e5e5;
    }

    .btn-new {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: #2563eb;
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .btn-new:hover {
      background: #3b82f6;
    }

    .workspace-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .workspace-item {
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 4px;
      transition: background 0.2s;
    }

    .workspace-item:hover {
      background: #262626;
    }

    .workspace-item.active {
      background: #1e3a5f;
    }

    .workspace-item .title {
      font-size: 14px;
      font-weight: 500;
      color: #e5e5e5;
      margin-bottom: 4px;
    }

    .workspace-item .meta {
      font-size: 12px;
      color: #737373;
      display: flex;
      gap: 8px;
    }

    .workspace-item .icons {
      display: flex;
      gap: 4px;
      margin-top: 6px;
    }

    .workspace-item .icon {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .workspace-item .icon.charts { background: #065f46; color: #34d399; }
    .workspace-item .icon.reports { background: #1e3a8a; color: #60a5fa; }
    .workspace-item .icon.logs { background: #713f12; color: #fbbf24; }

    /* 中间对话区域 */
    .chat-area {
      flex: 1;
      min-width: 400px;
      display: flex;
      flex-direction: column;
      background: #0d0d0d;
    }

    .chat-header {
      padding: 12px 20px;
      border-bottom: 1px solid #2a2a2a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #737373;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
    }

    .connection-status.connected .status-dot {
      background: #22c55e;
    }

    .stage-indicator {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
      background: #262626;
      color: #a3a3a3;
    }

    .stage-indicator.COLLECTING { background: #1e3a5f; color: #60a5fa; }
    .stage-indicator.PLANNING { background: #3f2e06; color: #fbbf24; }
    .stage-indicator.EXECUTING { background: #064e3b; color: #34d399; }
    .stage-indicator.REVIEWING { background: #4c1d95; color: #a78bfa; }
    .stage-indicator.COMPLETED { background: #14532d; color: #4ade80; }

    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .welcome-message {
      text-align: center;
      padding: 60px 20px;
      color: #737373;
    }

    .welcome-message h3 {
      font-size: 24px;
      color: #e5e5e5;
      margin-bottom: 8px;
    }

    .welcome-message .hint {
      margin-top: 16px;
      font-size: 14px;
    }

    .message {
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
    }

    .message.user {
      flex-direction: row-reverse;
    }

    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .message.agent .message-avatar {
      background: #2563eb;
      color: white;
    }

    .message.user .message-avatar {
      background: #404040;
      color: #e5e5e5;
    }

    .message.system .message-avatar {
      background: #525252;
      color: #d4d4d4;
    }

    .message-content {
      max-width: 70%;
      background: #171717;
      border-radius: 12px;
      padding: 12px 16px;
    }

    .message.user .message-content {
      background: #1d4ed8;
    }

    .message.system .message-content {
      background: transparent;
      color: #737373;
      font-size: 13px;
      text-align: center;
    }

    .message-header {
      font-size: 12px;
      color: #737373;
      margin-bottom: 6px;
    }

    .message.user .message-header {
      color: #93c5fd;
    }

    .message-body {
      font-size: 14px;
      line-height: 1.6;
      color: #e5e5e5;
    }

    .message-body code {
      background: #262626;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Consolas', monospace;
      font-size: 13px;
    }

    .message-body pre {
      background: #262626;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }

    .message-body pre code {
      background: none;
      padding: 0;
    }

    /* 输入区域 */
    .input-area {
      padding: 16px 20px;
      border-top: 1px solid #2a2a2a;
    }

    .input-wrapper {
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }

    .input-wrapper textarea {
      flex: 1;
      background: #171717;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 12px 16px;
      color: #e5e5e5;
      font-family: inherit;
      font-size: 14px;
      resize: none;
      outline: none;
      transition: border-color 0.2s;
    }

    .input-wrapper textarea:focus {
      border-color: #3b82f6;
    }

    .input-wrapper textarea::placeholder {
      color: #525252;
    }

    .input-wrapper textarea:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-send {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 12px;
      background: #2563eb;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .btn-send:hover:not(:disabled) {
      background: #3b82f6;
    }

    .btn-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .input-hint {
      margin-top: 8px;
      font-size: 12px;
      color: #525252;
    }

    /* 右侧边栏 */
    .sidebar-right {
      width: 320px;
      min-width: 320px;
      background: #171717;
      border-left: 1px solid #2a2a2a;
      display: flex;
      flex-direction: column;
    }

    .details-header {
      padding: 16px;
      border-bottom: 1px solid #2a2a2a;
    }

    .details-header h3 {
      font-size: 14px;
      font-weight: 600;
      color: #e5e5e5;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid #2a2a2a;
    }

    .tab {
      flex: 1;
      padding: 12px 8px;
      border: none;
      background: transparent;
      color: #737373;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }

    .tab:hover {
      color: #a3a3a3;
    }

    .tab.active {
      color: #e5e5e5;
      border-bottom-color: #2563eb;
    }

    .detail-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .empty-detail {
      text-align: center;
      color: #525252;
      padding: 40px 20px;
    }

    .detail-view {
      font-size: 13px;
      line-height: 1.6;
    }

    .detail-view h4 {
      color: #a3a3a3;
      font-size: 12px;
      font-weight: 500;
      margin: 16px 0 8px;
    }

    .detail-view h4:first-child {
      margin-top: 0;
    }

    .detail-view pre {
      background: #0d0d0d;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
    }

    .chart-list, .report-list, .log-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .chart-item, .report-item, .log-item {
      background: #0d0d0d;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .chart-item:hover, .report-item:hover, .log-item:hover {
      background: #262626;
    }

    .chart-item img, .chart-item svg {
      max-width: 100%;
      border-radius: 4px;
    }

    .chart-item .name, .report-item .name, .log-item .name {
      font-size: 13px;
      color: #e5e5e5;
    }

    .chart-item .time, .report-item .time, .log-item .time {
      font-size: 11px;
      color: #525252;
      margin-top: 4px;
    }

    .loading {
      text-align: center;
      color: #525252;
      padding: 20px;
    }

    .json-key { color: #9cdcfe; }
    .json-string { color: #ce9178; }
    .json-number { color: #b5cea8; }
    .json-boolean { color: #569cd6; }
    .json-null { color: #569cd6; }
  `,document.head.appendChild(e)}function ze(){document.getElementById(`btn-new-workspace`).addEventListener(`click`,Be),document.getElementById(`btn-send`).addEventListener(`click`,Ve),document.getElementById(`message-input`).addEventListener(`keydown`,e=>{e.key===`Enter`&&!e.shiftKey&&(e.preventDefault(),Ve())}),document.getElementById(`detail-tabs`).addEventListener(`click`,e=>{e.target.classList.contains(`tab`)&&(J.activeTab=e.target.dataset.tab,document.querySelectorAll(`.tab`).forEach(e=>e.classList.remove(`active`)),e.target.classList.add(`active`),$())})}async function Be(){let t=prompt(`请输入工作区名称:`);t&&e.send({type:`workspace:create`,data:{name:t}})}function Ve(){let t=document.getElementById(`message-input`),n=t.value.trim();!n||J.isAnalyzing||(Y({type:`user`,content:n,timestamp:new Date().toISOString()}),t.value=``,e.send({type:`chat:message`,data:{workspaceId:J.selectedWorkspaceId,message:n}}),J.isAnalyzing=!0,Z())}function Y(e){J.messages.push(e),He()}function He(){let e=document.getElementById(`message-list`);if(J.messages.length===0){e.innerHTML=`
      <div class="welcome-message">
        <h3>欢迎使用 Sherblock</h3>
        <p>区块链交易行为分析 Agent</p>
        <p class="hint">请从左侧选择一个工作区，或创建新工作区开始分析</p>
      </div>
    `;return}e.innerHTML=J.messages.map(e=>{let t=e.type===`user`?`U`:e.agentType||`A`,n=e.type===`system`?e.content:e.agentType?`${e.agentType} · ${X(e.timestamp)}`:`用户 · ${X(e.timestamp)}`,r=e.content;return e.type===`agent`&&e.agentType&&(r=Ue(e.content)),`
      <div class="message ${e.type}">
        <div class="message-avatar">${t}</div>
        <div class="message-content">
          <div class="message-header">${n}</div>
          <div class="message-body">${r}</div>
        </div>
      </div>
    `}).join(``),e.scrollTop=e.scrollHeight}function Ue(e){return q.parse(e)}function X(e){return new Date(e).toLocaleTimeString(`zh-CN`,{hour:`2-digit`,minute:`2-digit`})}function Z(){let e=document.getElementById(`message-input`),t=document.getElementById(`btn-send`);e.disabled=!J.selectedWorkspaceId||J.isAnalyzing,t.disabled=!J.selectedWorkspaceId||J.isAnalyzing,J.isAnalyzing?e.placeholder=`分析中...`:J.selectedWorkspaceId?e.placeholder=`输入您要分析的区块链地址或交易hash...`:e.placeholder=`请先选择一个工作区`}function We(e){J.connectionStatus=e;let t=document.getElementById(`connection-status`);t.className=`connection-status ${e}`,t.querySelector(`.status-text`).textContent=e===`connected`?`已连接`:`连接中...`}function Ge(e){J.stage=e;let t=document.getElementById(`stage-indicator`);t.textContent={IDLE:`空闲`,COLLECTING:`收集中`,PLANNING:`计划中`,EXECUTING:`执行中`,REVIEWING:`审核中`,COMPLETED:`已完成`}[e]||e,t.className=`stage-indicator ${e}`}function Q(){let e=document.getElementById(`workspace-list`);if(J.workspaces.length===0){e.innerHTML=`<div class="loading">暂无工作区</div>`;return}e.innerHTML=J.workspaces.map(e=>`
    <div class="workspace-item ${e.id===J.selectedWorkspaceId?`active`:``}"
         data-id="${e.id}">
      <div class="title">${e.name}</div>
      <div class="meta">${X(e.createdAt)}</div>
      <div class="icons">
        ${e.charts>0?`<span class="icon charts">C</span>`:``}
        ${e.reports>0?`<span class="icon reports">R</span>`:``}
        ${e.logs>0?`<span class="icon logs">L</span>`:``}
      </div>
    </div>
  `).join(``),e.querySelectorAll(`.workspace-item`).forEach(e=>{e.addEventListener(`click`,()=>{Ke(e.dataset.id)})})}async function Ke(t){J.selectedWorkspaceId=t,J.messages=[],J.scope=null,J.charts=[],J.reports=[],J.logs=[],Q(),He(),Z(),$(),e.send({type:`workspace:get`,data:{workspaceId:t}})}function $(){let e=document.getElementById(`detail-content`);if(!J.selectedWorkspaceId){e.innerHTML=`<div class="empty-detail"><p>选择一个工作区查看详情</p></div>`;return}switch(J.activeTab){case`scope`:qe(e);break;case`charts`:Je(e);break;case`reports`:Ye(e);break;case`logs`:Xe(e);break}}function qe(e){if(!J.scope){e.innerHTML=`<div class="loading">加载中...</div>`;return}e.innerHTML=`
    <div class="detail-view">
      <h4>Scope (状态变量)</h4>
      <pre><code>${Ze(JSON.stringify(J.scope,null,2))}</code></pre>
    </div>
  `}function Je(e){if(J.charts.length===0){e.innerHTML=`<div class="empty-detail"><p>暂无图表</p></div>`;return}e.innerHTML=`
    <div class="chart-list">
      ${J.charts.map(e=>`
        <div class="chart-item">
          <div class="name">${e.name}</div>
          <div class="time">${X(e.createdAt)}</div>
          ${e.svg?`<div class="chart-preview">${e.svg}</div>`:``}
        </div>
      `).join(``)}
    </div>
  `}function Ye(e){if(J.reports.length===0){e.innerHTML=`<div class="empty-detail"><p>暂无报告</p></div>`;return}e.innerHTML=`
    <div class="report-list">
      ${J.reports.map(e=>`
        <div class="report-item">
          <div class="name">${e.name}</div>
          <div class="time">${X(e.createdAt)}</div>
        </div>
      `).join(``)}
    </div>
  `}function Xe(e){if(J.logs.length===0){e.innerHTML=`<div class="empty-detail"><p>暂无日志</p></div>`;return}e.innerHTML=`
    <div class="log-list">
      ${J.logs.map(e=>`
        <div class="log-item">
          <div class="name">${e.name}</div>
          <div class="time">${X(e.createdAt)}</div>
        </div>
      `).join(``)}
    </div>
  `}function Ze(e){return e.replace(/"([^"]+)":/g,`<span class="json-key">"$1"</span>:`).replace(/: "([^"]+)"/g,`: <span class="json-string">"$1"</span>`).replace(/: (\d+)/g,`: <span class="json-number">$1</span>`).replace(/: (true|false)/g,`: <span class="json-boolean">$1</span>`).replace(/: (null)/g,`: <span class="json-null">$1</span>`)}function Qe(){e.on(`connected`,()=>{We(`connected`),e.send({type:`workspace:list`})}),e.on(`disconnected`,()=>{We(`disconnected`)}),e.on(`error`,e=>{console.error(`WebSocket error:`,e)}),e.on(`workspace:list`,e=>{J.workspaces=e.workspaces||[],Q()}),e.on(`workspace:created`,e=>{J.workspaces.unshift(e.workspace),Q(),Ke(e.workspace.id)}),e.on(`workspace:data`,e=>{let{workspaceId:t,scope:n,charts:r,reports:i,logs:a}=e;t===J.selectedWorkspaceId&&(J.scope=n,J.charts=r||[],J.reports=i||[],J.logs=a||[],$())}),e.on(`message:agent`,e=>{let{agentType:t,content:n,stage:r,step:i,totalSteps:a}=e;r&&Ge(r),typeof i==`number`&&(J.currentStep=i,J.totalSteps=a),Y({type:`agent`,agentType:t,content:n,timestamp:new Date().toISOString()}),r===`COMPLETED`&&(J.isAnalyzing=!1,Z())}),e.on(`message:user`,e=>{Y({type:`user`,content:e.content,timestamp:e.timestamp})}),e.on(`message:system`,e=>{Y({type:`system`,content:e.content,timestamp:e.timestamp})}),e.on(`file:changed`,t=>{let{workspaceId:n,type:r}=t;n===J.selectedWorkspaceId&&e.send({type:`workspace:get`,data:{workspaceId:n}})})}function $e(){Le(),ze(),Qe(),e.connect()}$e(),$e();