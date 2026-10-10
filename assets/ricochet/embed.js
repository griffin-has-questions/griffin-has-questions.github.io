(()=>{
  const frame=document.getElementById('ricochet-frame');if(!frame)return;
  function attach(){
    try{const doc=frame.contentDocument;if(!doc?.body)return;
      let pending=false;
      const resize=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;const height=Math.ceil(doc.body.getBoundingClientRect().height)+2;if(height>0&&Math.abs(parseFloat(frame.style.height||'0')-height)>1)frame.style.height=height+'px';});};
      resize();if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(doc.body);
    }catch(_){/* The initial height remains usable if an embed is hosted elsewhere. */}
  }
  frame.addEventListener('load',attach);if(frame.contentDocument?.readyState==='complete')attach();
})();
