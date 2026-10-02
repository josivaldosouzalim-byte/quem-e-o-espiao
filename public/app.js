const s=io();let profile=JSON.parse(localStorage.getItem("spyProfile")||"null"),state=null,stream=null,audioCtx=null,analyser=null,timer=null;
const $=x=>document.getElementById(x), show=x=>{["profile","home","game"].forEach(i=>$(i).classList.add("hide"));$(x).classList.remove("hide")};
function avatar(photo){return photo||"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23334466'/%3E%3Ctext x='50' y='62' text-anchor='middle' font-size='48'%3E👤%3C/text%3E%3C/svg%3E"}
function load(){if(profile){$("name").value=profile.name;$("preview").src=avatar(profile.photo);$("me").innerHTML=`<img class="avatar" src="${avatar(profile.photo)}"> <b>${profile.name}</b>`;show("home")}else show("profile")}load();
$("photo").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader;r.onload=()=>{$("preview").src=r.result};r.readAsDataURL(f)};
$("save").onclick=()=>{let name=$("name").value.trim();if(!name)return alert("Digite seu nome.");profile={name,photo:$("preview").src};localStorage.setItem("spyProfile",JSON.stringify(profile));load()};
$("edit").onclick=()=>show("profile");$("create").onclick=()=>s.emit("create",profile);$("join").onclick=()=>s.emit("join",{...profile,code:$("roomCode").value.trim()});
s.on("err",m=>alert(m));s.on("state",st=>{state=st;show("game");render()});s.on("secret",d=>{$("secret").classList.remove("hide");$("secret").innerHTML=`<div class="small">SUA PALAVRA • ${d.category}</div><h2>${d.word}</h2><b>🤫 Não diga a palavra. Dê apenas características.</b>`});
s.on("allVoted",()=>render());s.on("revealData",d=>{$("results").innerHTML=`<div class="result"><h2>🕵️ O ESPIÃO ERA...</h2><img class="avatar" src="${avatar(d.spy.photo)}"><h2>${d.spy.name}</h2><p>Palavra do grupo: <b>${d.normal}</b></p><p>Palavra do espião: <b>${d.spyword}</b></p></div>`});
function render(){if(!state)return;$("code").textContent="Sala "+state.code;let mine=state.players.find(p=>p.id===s.id),host=state.host===s.id,all=state.voteCount===state.total&&state.total>0;
$("players").innerHTML=state.players.map(p=>`<div class="player"><img id="av-${p.id}" class="avatar" src="${avatar(p.photo)}"><div><b>${p.name}</b>${p.id===state.host?" 👑":""}<div class="small">${["vote1","vote2"].includes(state.phase)?(p.voted?"✅ VOTOU":"⏳ AGUARDANDO"):""}</div></div><span class="status"></span></div>`).join("");
let n=$("notice");n.innerHTML="";$("voteBox").innerHTML="";$("hostControls").innerHTML="";if(state.phase==="lobby"){n.innerHTML=`<div class="alert">Sala de espera • ${state.total}/3 mínimo</div>`;if(host)$("hostControls").innerHTML=`<button onclick="s.emit('start')">INICIAR JOGO</button>`}
if(state.phase==="discussion"){n.innerHTML=`<div class="alert">🎙️ Discussão aberta. Descrevam suas palavras sem revelá-las.</div>`;if(host)$("hostControls").innerHTML=`<button onclick="s.emit('beginVote1')">🔒 FECHAR MICROFONES E INICIAR VOTAÇÃO</button>`}
if(["vote1","vote2"].includes(state.phase)){n.innerHTML=`<div class="alert"><h3>🗳️ ${state.phase==="vote1"?"PRIMEIRA VOTAÇÃO":"VOTAÇÃO FINAL"}</h3><b>Votos realizados: ${state.voteCount} / ${state.total}</b>${all?"<h2>⚠️ TODOS JÁ VOTARAM!</h2><p>Microfones continuam fechados.<br>Aguardando o anfitrião...</p>":""}</div>`;
if(!mine?.voted)$("voteBox").innerHTML=state.players.filter(p=>p.id!==s.id).map(p=>`<div class="player"><img class="avatar" src="${avatar(p.photo)}"><b>${p.name}</b><button class="voteBtn" onclick="s.emit('vote','${p.id}')">VOTAR</button></div>`).join("");else $("voteBox").innerHTML=`<div class="result">✅ Seu voto foi registrado.</div>`;
if(host&&all)$("hostControls").innerHTML=state.phase==="vote1"?`<button onclick="s.emit('hostOk1')">✅ OK — MOSTRAR RESULTADO E ABRIR DEFESA</button>`:`<button onclick="s.emit('reveal')">🕵️ OK — REVELAR O ESPIÃO</button>`}
if(state.phase==="defense"){n.innerHTML=`<div class="alert"><h2>🎙️ DEFESA</h2><p><b>${state.accused?.name||""}</b> recebeu mais votos e pode se defender.</p></div>`;results();if(host)$("hostControls").innerHTML=`<button onclick="s.emit('beginVote2')">🔒 ENCERRAR DEFESA E INICIAR VOTAÇÃO FINAL</button>`}
if(state.phase==="reveal"){results();if(host)$("hostControls").innerHTML=`<button onclick="s.emit('newRound')">🔄 NOVA RODADA</button>`}}
function results(){if(!state.results)return;let max=Math.max(1,...Object.values(state.results));$("results").innerHTML=`<div class="result"><h3>📊 CONTAGEM DOS VOTOS</h3>${state.players.map(p=>{let v=state.results[p.id]||0;return `<p><b>${p.name}</b> — ${v} voto${v===1?"":"s"}</p><div class="bar"><div class="fill" style="width:${v/max*100}%"></div></div>`}).join("")}</div>`}
$("mic").onclick=async()=>{if(stream){let on=!stream.getAudioTracks()[0].enabled;stream.getAudioTracks()[0].enabled=on;$("mic").textContent=on?"🎙️ Microfone: ligado":"🔇 Microfone: desligado";return}try{stream=await navigator.mediaDevices.getUserMedia({audio:true});$("mic").textContent="🎙️ Microfone: ligado";audioCtx=new AudioContext();let src=audioCtx.createMediaStreamSource(stream);analyser=audioCtx.createAnalyser();analyser.fftSize=512;src.connect(analyser);let a=new Uint8Array(analyser.frequencyBinCount),speaking=false;timer=setInterval(()=>{analyser.getByteFrequencyData(a);let avg=a.reduce((x,y)=>x+y,0)/a.length,on=avg>18;if(on!==speaking){speaking=on;s.emit("speaking",on);let el=$("av-"+s.id);if(el)el.classList.toggle("speaking",on)}},120)}catch(e){alert("Não foi possível acessar o microfone. Verifique a permissão do navegador.")}};
s.on("speaking",d=>{let el=$("av-"+d.id);if(el)el.classList.toggle("speaking",d.on)});


// ===== V5: ÁUDIO WEBRTC ENTRE APARELHOS =====
const peers=new Map(), remoteAudio=new Map(), remoteMeters=new Map();
const rtcConfig={iceServers:[
  {urls:"stun:stun.l.google.com:19302"},
  {urls:"stun:stun1.l.google.com:19302"}
]};

function phaseAllowsMyMic(){
  if(!state) return false;
  if(state.phase==="discussion") return true;
  if(state.phase==="defense") return state.accused?.id===s.id;
  return false;
}
function applyPhaseMic(){
  if(!stream) return;
  const allow=phaseAllowsMyMic();
  stream.getAudioTracks().forEach(t=>t.enabled=allow);
  $("mic").textContent=allow?"🎙️ Microfone: ligado":"🔇 Microfone: fechado pela rodada";
}
async function ensureLocalAudio(){
  if(stream) return stream;
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  setupLocalMeter();
  applyPhaseMic();
  return stream;
}
function setupLocalMeter(){
  if(audioCtx) return;
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  const src=audioCtx.createMediaStreamSource(stream);
  analyser=audioCtx.createAnalyser(); analyser.fftSize=512; src.connect(analyser);
  const a=new Uint8Array(analyser.frequencyBinCount); let speaking=false;
  timer=setInterval(()=>{
    if(!stream?.getAudioTracks()[0]?.enabled){ if(speaking){speaking=false;s.emit("speaking",false)} return; }
    analyser.getByteFrequencyData(a); const avg=a.reduce((x,y)=>x+y,0)/a.length, on=avg>18;
    if(on!==speaking){speaking=on;s.emit("speaking",on);$("av-"+s.id)?.classList.toggle("speaking",on)}
  },120);
}
function meterRemote(id,ms){
  if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  try{
    const an=audioCtx.createAnalyser();an.fftSize=512;
    audioCtx.createMediaStreamSource(ms).connect(an);
    const a=new Uint8Array(an.frequencyBinCount);
    const h=setInterval(()=>{an.getByteFrequencyData(a);let avg=a.reduce((x,y)=>x+y,0)/a.length;$("av-"+id)?.classList.toggle("speaking",avg>18)},120);
    remoteMeters.set(id,h);
  }catch(e){}
}
async function makePeer(id,initiator){
  if(id===s.id||peers.has(id))return peers.get(id);
  await ensureLocalAudio();
  const pc=new RTCPeerConnection(rtcConfig); peers.set(id,pc);
  stream.getTracks().forEach(t=>pc.addTrack(t,stream));
  pc.onicecandidate=e=>{if(e.candidate)s.emit("rtcIce",{to:id,candidate:e.candidate})};
  pc.ontrack=e=>{
    let a=remoteAudio.get(id);
    if(!a){a=document.createElement("audio");a.autoplay=true;a.playsInline=true;document.body.appendChild(a);remoteAudio.set(id,a)}
    a.srcObject=e.streams[0]; meterRemote(id,e.streams[0]);
  };
  pc.onconnectionstatechange=()=>{if(["failed","closed","disconnected"].includes(pc.connectionState)&&pc.connectionState!=="disconnected")dropPeer(id)};
  if(initiator){
    const offer=await pc.createOffer();await pc.setLocalDescription(offer);s.emit("rtcOffer",{to:id,sdp:pc.localDescription});
  }
  return pc;
}
function dropPeer(id){peers.get(id)?.close();peers.delete(id);remoteAudio.get(id)?.remove();remoteAudio.delete(id);if(remoteMeters.has(id)){clearInterval(remoteMeters.get(id));remoteMeters.delete(id)}}
async function syncPeers(){
  if(!state||state.phase==="lobby")return;
  try{await ensureLocalAudio()}catch(e){return}
  for(const p of state.players) if(p.id!==s.id&&!peers.has(p.id) && s.id<p.id) await makePeer(p.id,true);
  for(const id of [...peers.keys()]) if(!state.players.some(p=>p.id===id))dropPeer(id);
}
s.on("rtcOffer",async d=>{try{const pc=await makePeer(d.from,false);await pc.setRemoteDescription(d.sdp);const ans=await pc.createAnswer();await pc.setLocalDescription(ans);s.emit("rtcAnswer",{to:d.from,sdp:pc.localDescription})}catch(e){console.error(e)}});
s.on("rtcAnswer",async d=>{try{const pc=peers.get(d.from);if(pc)await pc.setRemoteDescription(d.sdp)}catch(e){console.error(e)}});
s.on("rtcIce",async d=>{try{const pc=peers.get(d.from)||await makePeer(d.from,false);if(d.candidate)await pc.addIceCandidate(d.candidate)}catch(e){console.error(e)}});

// Extend every state update after original render: enforce mic phase and connect peers.
s.on("state",async()=>{setTimeout(async()=>{applyPhaseMic();await syncPeers()},50)});

// Override mic button for V5: user can grant permission; game phases still have final control.
$("mic").onclick=async()=>{
  try{
    await ensureLocalAudio();
    if(audioCtx?.state==="suspended")await audioCtx.resume();
    applyPhaseMic();
    if(!phaseAllowsMyMic()) alert("O microfone está fechado nesta etapa. O jogo abrirá automaticamente quando sua fase permitir.");
  }catch(e){alert("Não foi possível acessar o microfone. Permita o uso do microfone no navegador.")}
};
