"use strict";(self.webpackChunkxvii_dev_homepage=self.webpackChunkxvii_dev_homepage||[]).push([[691],{72:function(e){var t=function(e,t){if("string"!=typeof e&&!Array.isArray(e))throw new TypeError("Expected the input to be `string | string[]`");t=Object.assign({pascalCase:!1},t);var a;return e=Array.isArray(e)?e.map((function(e){return e.trim()})).filter((function(e){return e.length})).join("-"):e.trim(),0===e.length?"":1===e.length?t.pascalCase?e.toUpperCase():e.toLowerCase():(e!==e.toLowerCase()&&(e=function(e){for(var t=!1,a=!1,r=!1,n=0;n<e.length;n++){var i=e[n];t&&/[a-zA-Z]/.test(i)&&i.toUpperCase()===i?(e=e.slice(0,n)+"-"+e.slice(n),t=!1,r=a,a=!0,n++):a&&r&&/[a-zA-Z]/.test(i)&&i.toLowerCase()===i?(e=e.slice(0,n-1)+"-"+e.slice(n-1),r=a,a=!1,t=!0):(t=i.toLowerCase()===i&&i.toUpperCase()!==i,r=a,a=i.toUpperCase()===i&&i.toLowerCase()!==i)}return e}(e)),e=e.replace(/^[_.\- ]+/,"").toLowerCase().replace(/[_.\- ]+(\w|$)/g,(function(e,t){return t.toUpperCase()})).replace(/\d+(\w|$)/g,(function(e){return e.toUpperCase()})),a=e,t.pascalCase?a.charAt(0).toUpperCase()+a.slice(1):a)};e.exports=t,e.exports.default=t},3723:function(e,t,a){a.d(t,{L:function(){return g},M:function(){return x},P:function(){return b},S:function(){return q},_:function(){return l},a:function(){return s},b:function(){return c},g:function(){return d},h:function(){return o}});var r=a(7294),n=(a(72),a(5697)),i=a.n(n);function s(){return s=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var a=arguments[t];for(var r in a)Object.prototype.hasOwnProperty.call(a,r)&&(e[r]=a[r])}return e},s.apply(this,arguments)}function l(e,t){if(null==e)return{};var a,r,n={},i=Object.keys(e);for(r=0;r<i.length;r++)t.indexOf(a=i[r])>=0||(n[a]=e[a]);return n}var o=function(){return"undefined"!=typeof HTMLImageElement&&"loading"in HTMLImageElement.prototype};function c(e,t,a,r,n){return void 0===n&&(n={}),s({},a,{loading:r,shouldLoad:e,"data-main-image":"",style:s({},n,{opacity:t?1:0})})}function d(e,t,a,r,n,i,l,o){var c={};i&&(c.backgroundColor=i,"fixed"===a?(c.width=r,c.height=n,c.backgroundColor=i,c.position="relative"):("constrained"===a||"fullWidth"===a)&&(c.position="absolute",c.top=0,c.left=0,c.bottom=0,c.right=0)),l&&(c.objectFit=l),o&&(c.objectPosition=o);var d=s({},e,{"aria-hidden":!0,"data-placeholder-image":"",style:s({opacity:t?0:1,transition:"opacity 500ms linear"},c)});return d}var u,m=["children"],p=function(e){var t=e.layout,a=e.width,n=e.height;return"fullWidth"===t?r.createElement("div",{"aria-hidden":!0,style:{paddingTop:n/a*100+"%"}}):"constrained"===t?r.createElement("div",{style:{maxWidth:a,display:"block"}},r.createElement("img",{alt:"",role:"presentation","aria-hidden":"true",src:"data:image/svg+xml;charset=utf-8,%3Csvg height='"+n+"' width='"+a+"' xmlns='http://www.w3.org/2000/svg' version='1.1'%3E%3C/svg%3E",style:{maxWidth:"100%",display:"block",position:"static"}})):null},g=function(e){var t=e.children,a=l(e,m);return r.createElement(r.Fragment,null,r.createElement(p,s({},a)),t,null)},f=["src","srcSet","loading","alt","shouldLoad"],h=["fallback","sources","shouldLoad"],v=function(e){var t=e.src,a=e.srcSet,n=e.loading,i=e.alt,o=void 0===i?"":i,c=e.shouldLoad,d=l(e,f);return r.createElement("img",s({},d,{decoding:"async",loading:n,src:c?t:void 0,"data-src":c?void 0:t,srcSet:c?a:void 0,"data-srcset":c?void 0:a,alt:o}))},y=function(e){var t=e.fallback,a=e.sources,n=void 0===a?[]:a,i=e.shouldLoad,o=void 0===i||i,c=l(e,h),d=c.sizes||(null==t?void 0:t.sizes),u=r.createElement(v,s({},c,t,{sizes:d,shouldLoad:o}));return n.length?r.createElement("picture",null,n.map((function(e){var t=e.media,a=e.srcSet,n=e.type;return r.createElement("source",{key:t+"-"+n+"-"+a,type:n,media:t,srcSet:o?a:void 0,"data-srcset":o?void 0:a,sizes:d})})),u):u};v.propTypes={src:n.string.isRequired,alt:n.string.isRequired,sizes:n.string,srcSet:n.string,shouldLoad:n.bool},y.displayName="Picture",y.propTypes={alt:n.string.isRequired,shouldLoad:n.bool,fallback:n.exact({src:n.string.isRequired,srcSet:n.string,sizes:n.string}),sources:n.arrayOf(n.oneOfType([n.exact({media:n.string.isRequired,type:n.string,sizes:n.string,srcSet:n.string.isRequired}),n.exact({media:n.string,type:n.string.isRequired,sizes:n.string,srcSet:n.string.isRequired})]))};var w=["fallback"],b=function(e){var t=e.fallback,a=l(e,w);return t?r.createElement(y,s({},a,{fallback:{src:t},"aria-hidden":!0,alt:""})):r.createElement("div",s({},a))};b.displayName="Placeholder",b.propTypes={fallback:n.string,sources:null==(u=y.propTypes)?void 0:u.sources,alt:function(e,t,a){return e[t]?new Error("Invalid prop `"+t+"` supplied to `"+a+"`. Validation failed."):null}};var x=function(e){return r.createElement(r.Fragment,null,r.createElement(y,s({},e)),r.createElement("noscript",null,r.createElement(y,s({},e,{shouldLoad:!0}))))};x.displayName="MainImage",x.propTypes=y.propTypes;var E,L,C=function(e,t,a){for(var r=arguments.length,n=new Array(r>3?r-3:0),s=3;s<r;s++)n[s-3]=arguments[s];return e.alt||""===e.alt?i().string.apply(i(),[e,t,a].concat(n)):new Error('The "alt" prop is required in '+a+'. If the image is purely presentational then pass an empty string: e.g. alt="". Learn more: https://a11y-style-guide.com/style-guide/section-media.html')},S={image:i().object.isRequired,alt:C},k=["as","image","style","backgroundColor","className","class","onStartLoad","onLoad","onError"],I=["style","className"],z=new Set,N=function(e){var t=e.as,n=void 0===t?"div":t,i=e.image,c=e.style,d=e.backgroundColor,u=e.className,m=e.class,p=e.onStartLoad,g=e.onLoad,f=e.onError,h=l(e,k),v=i.width,y=i.height,w=i.layout,b=function(e,t,a){var r={},n="gatsby-image-wrapper";return"fixed"===a?(r.width=e,r.height=t):"constrained"===a&&(n="gatsby-image-wrapper gatsby-image-wrapper-constrained"),{className:n,"data-gatsby-image-wrapper":"",style:r}}(v,y,w),x=b.style,C=b.className,S=l(b,I),N=(0,r.useRef)(),T=(0,r.useMemo)((function(){return JSON.stringify(i.images)}),[i.images]);m&&(u=m);var _=function(e,t,a){var r="";return"fullWidth"===e&&(r='<div aria-hidden="true" style="padding-top: '+a/t*100+'%;"></div>'),"constrained"===e&&(r='<div style="max-width: '+t+'px; display: block;"><img alt="" role="presentation" aria-hidden="true" src="data:image/svg+xml;charset=utf-8,%3Csvg height=\''+a+"' width='"+t+"' xmlns='http://www.w3.org/2000/svg' version='1.1'%3E%3C/svg%3E\" style=\"max-width: 100%; display: block; position: static;\"></div>"),r}(w,v,y);return(0,r.useEffect)((function(){E||(E=Promise.all([a.e(774),a.e(217)]).then(a.bind(a,9217)).then((function(e){var t=e.renderImageToString,a=e.swapPlaceholderImage;return L=t,{renderImageToString:t,swapPlaceholderImage:a}})));var e,t,r=N.current.querySelector("[data-gatsby-image-ssr]");return r&&o()?(r.complete?(null==p||p({wasCached:!0}),null==g||g({wasCached:!0}),setTimeout((function(){r.removeAttribute("data-gatsby-image-ssr")}),0)):(null==p||p({wasCached:!0}),r.addEventListener("load",(function e(){r.removeEventListener("load",e),null==g||g({wasCached:!0}),setTimeout((function(){r.removeAttribute("data-gatsby-image-ssr")}),0)}))),void z.add(T)):L&&z.has(T)?void 0:(E.then((function(a){var r=a.renderImageToString,n=a.swapPlaceholderImage;N.current&&(N.current.innerHTML=r(s({isLoading:!0,isLoaded:z.has(T),image:i},h)),z.has(T)||(e=requestAnimationFrame((function(){N.current&&(t=n(N.current,T,z,c,p,g,f))}))))})),function(){e&&cancelAnimationFrame(e),t&&t()})}),[i]),(0,r.useLayoutEffect)((function(){z.has(T)&&L&&(N.current.innerHTML=L(s({isLoading:z.has(T),isLoaded:z.has(T),image:i},h)),null==p||p({wasCached:!0}),null==g||g({wasCached:!0}))}),[i]),(0,r.createElement)(n,s({},S,{style:s({},x,c,{backgroundColor:d}),className:C+(u?" "+u:""),ref:N,dangerouslySetInnerHTML:{__html:_},suppressHydrationWarning:!0}))},T=(0,r.memo)((function(e){return e.image?(0,r.createElement)(N,e):null}));T.propTypes=S,T.displayName="GatsbyImage";var _,H=["src","__imageData","__error","width","height","aspectRatio","tracedSVGOptions","placeholder","formats","quality","transformOptions","jpgOptions","pngOptions","webpOptions","avifOptions","blurredOptions","breakpoints","outputPixelDensities"],O=function(e,t){for(var a=arguments.length,r=new Array(a>2?a-2:0),n=2;n<a;n++)r[n-2]=arguments[n];return"fullWidth"!==e.layout||"width"!==t&&"height"!==t||!e[t]?i().number.apply(i(),[e,t].concat(r)):new Error('"'+t+'" '+e[t]+" may not be passed when layout is fullWidth.")},M=new Set(["fixed","fullWidth","constrained"]),j={src:i().string.isRequired,alt:C,width:O,height:O,sizes:i().string,layout:function(e){if(void 0!==e.layout&&!M.has(e.layout))return new Error("Invalid value "+e.layout+'" provided for prop "layout". Defaulting to "constrained". Valid values are "fixed", "fullWidth" or "constrained".')}},q=(_=T,function(e){var t=e.src,a=e.__imageData,n=e.__error,i=l(e,H);return n&&console.warn(n),a?r.createElement(_,s({image:a},i)):(console.warn("Image not loaded",t),null)});q.displayName="StaticImage",q.propTypes=j},7200:function(e,t,a){a.r(t),a.d(t,{Head:function(){return i}});var r=a(7294),n=a(3723);t.default=function(){return r.createElement("main",{className:"snap-mandatory snap-y h-screen overflow-auto"},r.createElement("div",{className:"min-h-screen w-full bg-slate-800 flex flex-col md:flex-row items-center justify-center p-4 gap-6 snap-center"},r.createElement("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 24 24",className:"h-32 w-32"},r.createElement("path",{fill:"#FFFFFF",d:"M19.3,11.6h-1.5V0.8h1.5V11.6z M10,14H14v-1.5H10V14z M16.7,0.8h-1.5v10.7h1.5V0.8z M11.5,16.6h1.8v-1.5H10v1.5h0v5.1h0v1.5H14v-1.5h-2.6V16.6z M7.3,3.7L6.8,4.2c0,0-0.5-0.5-0.5-0.5V0.8H4.8v3.5c0,0,1,1,1,1l-1,1l0,5.3h1.5l0-4.7l0.5-0.5l0.6,0.6l0,4.6h1.5l0-5.2c0,0-1-1-1-1l1-1V0.8H7.3V3.7z M12.5,8.9L12.5,8.9L12,9.4c0,0-0.5-0.5-0.5-0.5l0-8.1H10v8.7l2,2L14,9.5V0.8h-1.5V8.9z M17.8,12.4c0,0,0,8.1,0,8.1l-0.6,0.6c0,0-0.5-0.5-0.5-0.5l0-8.1h-1.5v8.7l2,2l2.1-2.1v-8.7H17.8z M8.8,12.4L8.8,12.4l0,1.5h0v6.7l-2.6,2.6H4.7l0-10.7C4.7,12.4,8.8,12.4,8.8,12.4z M7.3,14H6.2v7.1L7.3,20v0C7.3,20,7.3,14,7.3,14z"}))),r.createElement("div",{className:"snap-center min-h-screen w-full bg-slate-800 flex flex-col md:flex-row items-center justify-center p-4 gap-6"},r.createElement(n.S,{className:"h-60 w-60 md:h-64 md:w-64 lg:h-80 lg:w-80",src:"../images/ismail.png",alt:"Ismail",width:320,height:320,__imageData:a(7300)}),r.createElement("div",{className:"text-white text-center md:text-left text-2xl md:text-3xl lg:text-4xl font-mono"},r.createElement("div",{className:"my-2 md:my-4 lg:my-6"},"Hi, I'm ",r.createElement("strong",null,"Ismail")," and"),r.createElement("div",{className:"my-2 md:my-4 lg:my-6"},"I'm a"," ",r.createElement("span",{className:"bg-white text-slate-800 px-2"},"Full Stack Web Developer")),r.createElement("div",{className:"text-base font-sans font-normal md:font-lg mt-6 max-w-xl"},"I'm a Full Stack Web Developer based in Sinjai, Sulawesi Selatan, Indonesia. Experienced JavaScript Developer with 3 years. Proficient with React. Created data visualization tools and integrated designs. I'm open to new opportunities and interesting projects."))))};var i=function(){return r.createElement("title",null,"XVII Dev")}},7300:function(e){e.exports=JSON.parse('{"layout":"constrained","backgroundColor":"#f8f8f8","images":{"fallback":{"src":"/static/eb297576fddc0df394a07a294a9da069/5f035/ismail.png","srcSet":"/static/eb297576fddc0df394a07a294a9da069/1f8a1/ismail.png 80w,\\n/static/eb297576fddc0df394a07a294a9da069/e9a79/ismail.png 160w,\\n/static/eb297576fddc0df394a07a294a9da069/5f035/ismail.png 320w,\\n/static/eb297576fddc0df394a07a294a9da069/eadd3/ismail.png 640w","sizes":"(min-width: 320px) 320px, 100vw"},"sources":[{"srcSet":"/static/eb297576fddc0df394a07a294a9da069/61ca6/ismail.webp 80w,\\n/static/eb297576fddc0df394a07a294a9da069/60b4d/ismail.webp 160w,\\n/static/eb297576fddc0df394a07a294a9da069/5e011/ismail.webp 320w,\\n/static/eb297576fddc0df394a07a294a9da069/90d07/ismail.webp 640w","type":"image/webp","sizes":"(min-width: 320px) 320px, 100vw"}]},"width":320,"height":320}')}}]);
//# sourceMappingURL=component---src-pages-index-tsx-b0a7ccba087460389671.js.map