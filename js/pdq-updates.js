(function(){
  "use strict";
  const DEFAULT_DINNER=["Pizza","Churrasco","Hambúrguer"];
  const DEFAULT_HAND=["Maior pote","Melhor blefe","Maior virada"];
  // Keep player profiles private/offline-safe: use initials instead of unreachable third-party photos.
  let rankingData;
  Object.defineProperty(window,"PQ_RANKING",{configurable:true,enumerable:true,get:()=>rankingData,set:value=>{if(value&&Array.isArray(value.jogadores))value.jogadores.forEach(player=>{player.foto="";});rankingData=value;}});
  if(window.PQFirebase?.load){const load=window.PQFirebase.load.bind(window.PQFirebase);window.PQFirebase.load=async(...args)=>{const data=await load(...args);return {...data,photos:{}};};}
  const db=window.PQ_FIREBASE?.config?.databaseURL?.replace(/\/$/,"")||"";
  const endpoint=path=>db?`${db}/${path.replace(/^\/+|\/+$/g,"")}.json`:"";
  const wa=`https://wa.me/${window.PQ_DATA?.site?.whatsapp||"5541987210685"}`;
  const shopGrid=()=>document.querySelector("#shop-grid");
  const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  if(window.PQ_DATA){window.PQ_DATA.shop=[
    {id:"camisa-2027",name:"Camiseta oficial Poker de Quinta",category:"Vestuário",price:159.9,description:"A camiseta oficial da temporada 2027. Escolha o tamanho e confirme disponibilidade pelo WhatsApp.",badge:"Oficial",sizes:["P","M","G","GG"],art:"shirt"},
    {id:"ovo-codorna-conserva",name:"Ovo de codorna em conserva",category:"Da casa",price:0,description:"Ovos de codorna em conserva em pote pequeno ou grande. Consulte o valor com a organização.",badge:"P ou G",sizes:["P","G"],art:"ovos-codorna"}
  ];}
  const selections={};
  function customStore(){
    const grid=shopGrid();if(!grid)return;
    const shirt=window.PQ_DATA.shop[0], egg=window.PQ_DATA.shop[1];
    const card=(product,kind)=>{
      const img=kind==="egg"?`<img src="${new URL("assets/img/ovos-codorna-conserva.png",document.baseURI).href}" alt="Dois potes de ovos de codorna em conserva: pequeno P e grande G" loading="lazy" decoding="async">`:`<div class="shirt-illustration"><span>POKER DE QUINTA</span><strong>2027</strong><i>♠</i></div>`;
      const sizes=product.sizes.map(s=>`<button type="button" class="size-chip${selections[product.id]===s?" is-selected":""}" data-pdq-size="${product.id}" data-size="${safe(s)}" aria-pressed="${selections[product.id]===s}">${safe(s)}</button>`).join("");
      const price=kind==="egg"?`<div class="product-card__price">Consulte<small>valor pelo WhatsApp</small></div>`:`<div class="product-card__price">R$ 159,90<small>valor de referência do site</small></div>`;
      return `<article class="product-card"><div class="product-card__art${kind==="egg"?" product-card__art--photo":" product-card__art--shirt"}"><span class="product-card__badge">${product.badge}</span><div class="product-art">${img}</div></div><div class="product-card__body"><span class="product-card__category">${safe(product.category)}</span><h3 class="product-card__name">${safe(product.name)}</h3><p class="product-card__desc">${safe(product.description)}</p><div class="size-row" role="group" aria-label="Escolha o tamanho de ${safe(product.name)}">${sizes}</div><div class="product-card__bottom">${price}<button class="btn btn--primary product-card__add" type="button" data-pdq-order="${product.id}">Pedir no WhatsApp <svg class="icon" aria-hidden="true"><use href="#i-whatsapp"></use></svg></button></div></div></article>`;
    };
    grid.innerHTML=card(shirt,"shirt")+card(egg,"egg");
    const count=document.querySelector("#shop-count");if(count)count.textContent="2 produtos";
  }
  function stage(){return Number(window.PQ_DATA?.site?.nextStageId)||1;}
  function voteKey(){return `pq-vote-2027-${stage()}`;}
  function showExisting(){try{if(!localStorage.getItem(voteKey()))return false;const form=document.querySelector("#stage-vote-form"),next=document.querySelector("#vote-next-step");if(form)form.hidden=true;if(next)next.hidden=false;const s=document.querySelector("#vote-options-status");if(s)s.textContent="Você já registrou sua votação neste dispositivo.";return true;}catch(_){return false;}}
  function renderDinner(list){const root=document.querySelector("#dinner-vote-options"),status=document.querySelector("#vote-options-status"),button=document.querySelector("#submit-stage-vote");if(!root)return;
    const opts=Array.isArray(list)?list.filter(x=>typeof x==="string"&&x.trim()):DEFAULT_DINNER;
    if(opts.length!==3){root.innerHTML="";if(status)status.textContent="A votação só abre quando houver exatamente três opções de janta cadastradas.";if(button)button.disabled=true;return;}
    if(button)button.disabled=false;if(status)status.textContent="Escolha uma opção de janta e uma Mão da Etapa.";
    root.innerHTML=opts.map((x,i)=>`<label class="vote-option"><input type="radio" name="janta" value="${safe(x)}" required><span><strong>${safe(x)}</strong></span></label>`).join("");
  }
  async function get(path){const r=await fetch(endpoint(path));if(!r.ok)throw new Error(`Firebase ${r.status}`);return r.json();}
  async function loadDinner(){try{const opts=await get("votacaoConfig/2027/opcoesJanta");renderDinner(Array.isArray(opts)?opts:DEFAULT_DINNER);}catch(_){renderDinner(DEFAULT_DINNER);const s=document.querySelector("#vote-options-status");if(s)s.textContent="Opções padrão carregadas; a gravação depende das permissões do Firebase.";}showExisting();}
  document.addEventListener("click",function(e){
    const size=e.target.closest("[data-pdq-size]");if(size){e.preventDefault();e.stopImmediatePropagation();selections[size.dataset.pdqSize]=size.dataset.size;customStore();return;}
    const order=e.target.closest("[data-pdq-order]");if(order){e.preventDefault();e.stopImmediatePropagation();const product=window.PQ_DATA.shop.find(x=>x.id===order.dataset.pdqOrder),chosen=selections[order.dataset.pdqOrder];if(!chosen){alert("Escolha um tamanho antes de pedir.");return;}const msg=product.id==="ovo-codorna-conserva"?`Olá! Quero pedir ovo de codorna em conserva, tamanho ${chosen}. Pode me informar o valor e a disponibilidade?`:`Olá! Quero pedir a ${product.name}, tamanho ${chosen}. Pode confirmar disponibilidade e pagamento?`;window.open(`${wa}?text=${encodeURIComponent(msg)}`,"_blank","noopener");return;}
    const confirm=e.target.closest("[data-confirm-open]");if(confirm){e.preventDefault();location.hash="confirmar";}
  },true);
  function initUpdates(){setTimeout(customStore,0);loadDinner();const form=document.querySelector("#stage-vote-form");if(!form)return;form.addEventListener("submit",async e=>{e.preventDefault();const dinner=form.querySelector('input[name="janta"]:checked')?.value,hand=form.querySelector('input[name="maoEtapa"]:checked')?.value,error=document.querySelector("#vote-error"),button=document.querySelector("#submit-stage-vote");if(!form.reportValidity()||!dinner||!hand)return;button.disabled=true;button.textContent="Registrando votos…";try{if(!endpoint("x"))throw new Error("Firebase não configurado.");const response=await fetch(endpoint(`votacoes/2027/etapas/${stage()}`),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({janta:dinner,maoEtapa:hand,criadoEm:new Date().toISOString()})});if(!response.ok)throw new Error(`Firebase ${response.status}`);try{localStorage.setItem(voteKey(),JSON.stringify({janta:dinner,maoEtapa:hand,at:Date.now()}));}catch(_){}form.hidden=true;document.querySelector("#vote-next-step").hidden=false;document.querySelector("#vote-options-status").textContent="Votos registrados com sucesso.";}catch(err){error.textContent=`Não foi possível registrar os votos (${err.message}). A gravação no Firebase é necessária para liberar a inscrição; verifique as permissões e tente de novo.`;error.hidden=false;button.disabled=false;button.textContent="Registrar votos e continuar";}});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initUpdates,{once:true});else initUpdates();
})();
