// Rules are kept outside the game code so site owners can edit rules.html directly.
(()=>{
  const copy=document.getElementById('rp-rules-copy');
  if(!copy||!document.currentScript)return;
  const source=new URL('rules.html',document.currentScript.src);
  fetch(source,{cache:'no-cache',credentials:'same-origin'})
    .then(response=>{if(!response.ok)throw Error('Rules unavailable');return response.text();})
    .then(html=>{copy.innerHTML=html;})
    .catch(()=>{/* Keep the bundled rules when offline. */});
})();
