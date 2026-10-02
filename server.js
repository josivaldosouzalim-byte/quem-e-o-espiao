const express=require("express"),http=require("http"),{Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server,{maxHttpBufferSize:5e6,pingTimeout:30000,pingInterval:10000});
app.use(express.static("public"));
const rooms={};
const bank={
"Países":[["Brasil","Argentina"],["Japão","Coreia do Sul"],["Portugal","Espanha"],["Estados Unidos","Canadá"],["França","Itália"],["Austrália","Nova Zelândia"],["México","Colômbia"],["China","Índia"]],
"Futebol":[["Real Madrid","Barcelona"],["Corinthians","Palmeiras"],["Flamengo","Vasco"],["São Paulo","Santos"],["Manchester City","Liverpool"],["Grêmio","Internacional"],["Bayern de Munique","Borussia Dortmund"],["Brasil","Argentina"]],
"Objetos":[["Garfo","Colher"],["Celular","Tablet"],["Cadeira","Banco"],["Lápis","Caneta"],["Copo","Caneca"],["Relógio","Cronômetro"],["Mochila","Mala"],["Ventilador","Ar-condicionado"]],
"Famosos":[["Neymar","Vinícius Júnior"],["Cristiano Ronaldo","Lionel Messi"],["Anitta","Ivete Sangalo"],["Silvio Santos","Faustão"],["Ayrton Senna","Lewis Hamilton"]],
"Animais":[["Leão","Tigre"],["Cachorro","Lobo"],["Gato","Onça"],["Golfinho","Baleia"],["Águia","Falcão"],["Cavalo","Zebra"],["Jacaré","Crocodilo"]],
"Comidas":[["Pizza","Lasanha"],["Hambúrguer","Sanduíche"],["Arroz","Macarrão"],["Sorvete","Açaí"],["Bolo","Torta"],["Coxinha","Pastel"],["Chocolate","Brigadeiro"]],
"Lugares":[["Praia","Piscina"],["Escola","Faculdade"],["Hospital","Clínica"],["Cinema","Teatro"],["Shopping","Supermercado"],["Hotel","Pousada"],["Parque","Praça"]]
};
const mkcode=()=>{let c;do c=Math.random().toString(36).slice(2,7).toUpperCase();while(rooms[c]);return c};
const defaults=()=>({categories:Object.keys(bank),rounds:5,discussionSeconds:120,defenseSeconds:45});
const norm=x=>String(x||"").trim().toUpperCase().replace(/\s+/g,"");
function pub(r){return{code:r.code,host:r.host,phase:r.phase,round:r.round||0,settings:r.settings,players:Object.values(r.players).map(p=>({id:p.id,token:p.token,name:p.name,photo:p.photo,score:p.score||0,voted:!!r.votes[p.id]})),voteCount:Object.keys(r.votes).length,total:Object.keys(r.players).length,accused:r.accused?{id:r.accused,name:r.players[r.accused]?.name,photo:r.players[r.accused]?.photo}:null,results:r.results||null,category:r.category||null,deadline:r.deadline||null}}
function emit(r){io.to(r.code).emit("state",pub(r))}
function top(r){let c={};Object.values(r.votes).forEach(v=>c[v]=(c[v]||0)+1);let mx=Math.max(0,...Object.values(c));return{counts:c,ids:Object.keys(c).filter(k=>c[k]===mx),max:mx}}
function clearT(r){if(r.timer)clearTimeout(r.timer);r.timer=null;r.deadline=null}
function timed(r,sec,fn){clearT(r);r.deadline=Date.now()+sec*1000;r.timer=setTimeout(()=>{r.timer=null;r.deadline=null;fn()},sec*1000);emit(r)}
function startRound(r){clearT(r);if(r.round>=r.settings.rounds){r.phase="gameover";emit(r);return}r.round++;let cats=r.settings.categories.filter(c=>bank[c]);if(!cats.length)cats=Object.keys(bank);let cat=cats[Math.floor(Math.random()*cats.length)],pair=bank[cat][Math.floor(Math.random()*bank[cat].length)],ids=Object.keys(r.players);r.spy=ids[Math.floor(Math.random()*ids.length)];r.category=cat;r.normal=pair[0];r.spyword=pair[1];r.phase="discussion";r.votes={};r.results=null;r.accused=null;ids.forEach(id=>io.to(id).emit("secret",{word:id===r.spy?r.spyword:r.normal,category:cat,round:r.round}));timed(r,r.settings.discussionSeconds,()=>{r.phase="vote1";r.votes={};emit(r)})}
function validateProfile(d){return d&&typeof d.name==="string"&&d.name.trim().length>=1&&d.name.trim().length<=30}
function removeOldToken(r,token,newId){if(!token)return null;let old=Object.values(r.players).find(p=>p.token===token);if(old&&old.id!==newId){delete r.players[old.id];return old}return null}
io.on("connection",s=>{
 s.on("create",(d,ack)=>{try{if(!validateProfile(d)){ack?.({ok:false,error:"Digite um nome válido."});return}let c=mkcode(),token=String(d.token||s.id);rooms[c]={code:c,host:s.id,players:{},phase:"lobby",votes:{},round:0,settings:defaults()};rooms[c].players[s.id]={id:s.id,token,name:d.name.trim(),photo:d.photo||"",score:0};s.join(c);s.data.room=c;s.data.token=token;ack?.({ok:true,code:c});s.emit("joinSuccess",{code:c});emit(rooms[c])}catch(e){console.error("create",e);ack?.({ok:false,error:"Não foi possível criar a sala."})}});
 s.on("join",(d,ack)=>{try{let c=norm(d?.code),r=rooms[c];if(!c){ack?.({ok:false,error:"Digite o código da sala."});return}if(!r){ack?.({ok:false,error:"Sala não encontrada. Confira o código."});return}if(r.phase!=="lobby"){ack?.({ok:false,error:"A partida já começou."});return}if(!validateProfile(d)){ack?.({ok:false,error:"Perfil inválido."});return}let token=String(d.token||s.id),old=removeOldToken(r,token,s.id),score=old?.score||0;r.players[s.id]={id:s.id,token,name:d.name.trim(),photo:d.photo||"",score};if(old&&r.host===old.id)r.host=s.id;s.join(r.code);s.data.room=r.code;s.data.token=token;ack?.({ok:true,code:r.code,total:Object.keys(r.players).length});s.emit("joinSuccess",{code:r.code});emit(r);console.log("JOIN",r.code,d.name,"TOTAL",Object.keys(r.players).length)}catch(e){console.error("join",e);ack?.({ok:false,error:"Erro ao entrar na sala."})}});
 s.on("settings",d=>{let r=rooms[s.data.room];if(!r||r.host!==s.id||r.phase!=="lobby")return;r.settings={categories:Array.isArray(d.categories)&&d.categories.length?d.categories:Object.keys(bank),rounds:Math.max(1,Math.min(20,+d.rounds||5)),discussionSeconds:Math.max(30,Math.min(600,+d.discussionSeconds||120)),defenseSeconds:Math.max(15,Math.min(180,+d.defenseSeconds||45))};emit(r)});
 s.on("start",()=>{let r=rooms[s.data.room];if(!r||r.host!==s.id)return;if(Object.keys(r.players).length<3)return s.emit("err","São necessários pelo menos 3 jogadores.");r.round=0;Object.values(r.players).forEach(p=>p.score=0);startRound(r)});
 s.on("beginVote1",()=>{let r=rooms[s.data.room];if(r&&r.host===s.id&&r.phase==="discussion"){clearT(r);r.phase="vote1";r.votes={};emit(r)}});
 s.on("vote",id=>{let r=rooms[s.data.room];if(!r||!["vote1","vote2"].includes(r.phase)||r.votes[s.id]||!r.players[id]||id===s.id)return;r.votes[s.id]=id;emit(r);if(Object.keys(r.votes).length===Object.keys(r.players).length)io.to(r.code).emit("allVoted")});
 s.on("hostOk1",()=>{let r=rooms[s.data.room];if(!r||r.host!==s.id||r.phase!=="vote1"||Object.keys(r.votes).length<Object.keys(r.players).length)return;let t=top(r);r.results=t.counts;r.accused=t.ids[0];r.phase="defense";timed(r,r.settings.defenseSeconds,()=>{r.phase="vote2";r.votes={};r.results=null;emit(r)})});
 s.on("beginVote2",()=>{let r=rooms[s.data.room];if(r&&r.host===s.id&&r.phase==="defense"){clearT(r);r.phase="vote2";r.votes={};r.results=null;emit(r)}});
 s.on("reveal",()=>{let r=rooms[s.data.room];if(!r||r.host!==s.id||r.phase!=="vote2"||Object.keys(r.votes).length<Object.keys(r.players).length)return;let t=top(r);r.results=t.counts;r.phase="reveal";let caught=t.ids.length===1&&t.ids[0]===r.spy;if(caught){Object.entries(r.votes).forEach(([voter,target])=>{if(target===r.spy&&r.players[voter])r.players[voter].score=(r.players[voter].score||0)+2})}else if(r.players[r.spy])r.players[r.spy].score=(r.players[r.spy].score||0)+3;emit(r);io.to(r.code).emit("revealData",{spy:r.players[r.spy],normal:r.normal,spyword:r.spyword,caught})});
 s.on("newRound",()=>{let r=rooms[s.data.room];if(r&&r.host===s.id&&r.phase==="reveal")startRound(r)});
 s.on("restartGame",()=>{let r=rooms[s.data.room];if(r&&r.host===s.id){clearT(r);r.phase="lobby";r.round=0;r.votes={};r.results=null;r.accused=null;emit(r)}});
 s.on("kick",id=>{let r=rooms[s.data.room];if(!r||r.host!==s.id||id===s.id||!r.players[id])return;io.to(id).emit("kicked");io.sockets.sockets.get(id)?.leave(r.code);delete r.players[id];emit(r)});
 s.on("speaking",v=>{let r=rooms[s.data.room];if(r)s.to(r.code).emit("speaking",{id:s.id,on:!!v})});
 s.on("rtcOffer",d=>{let r=rooms[s.data.room];if(r&&r.players[d.to])io.to(d.to).emit("rtcOffer",{from:s.id,sdp:d.sdp})});
 s.on("rtcAnswer",d=>{let r=rooms[s.data.room];if(r&&r.players[d.to])io.to(d.to).emit("rtcAnswer",{from:s.id,sdp:d.sdp})});
 s.on("rtcIce",d=>{let r=rooms[s.data.room];if(r&&r.players[d.to])io.to(d.to).emit("rtcIce",{from:s.id,candidate:d.candidate})});
 s.on("disconnect",()=>{let r=rooms[s.data.room];if(!r)return;let id=s.id;setTimeout(()=>{if(!rooms[r.code]||!r.players[id])return;delete r.players[id];if(!Object.keys(r.players).length){clearT(r);delete rooms[r.code];return}if(r.host===id)r.host=Object.keys(r.players)[0];emit(r)},5000)})
});
server.listen(process.env.PORT||3000,()=>console.log("QUEM É O ESPIÃO V6.1 ONLINE em porta "+(process.env.PORT||3000)));
