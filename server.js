
const express=require("express"), http=require("http"), {Server}=require("socket.io");
const app=express(), server=http.createServer(app), io=new Server(server,{maxHttpBufferSize:2e6});
app.use(express.static("public"));
const rooms={};
const pairs=[
 ["Países","Brasil","Argentina"],["Países","Japão","Coreia do Sul"],["Futebol","Real Madrid","Barcelona"],
 ["Futebol","Corinthians","Palmeiras"],["Objetos","Garfo","Colher"],["Objetos","Celular","Tablet"],
 ["Famosos","Neymar","Vinícius Júnior"],["Animais","Leão","Tigre"],["Comidas","Pizza","Lasanha"],
 ["Lugares","Praia","Piscina"]
];
const code=()=>Math.random().toString(36).slice(2,7).toUpperCase();
function pub(r){return {code:r.code,host:r.host,phase:r.phase,players:Object.values(r.players).map(p=>({id:p.id,name:p.name,photo:p.photo,voted:!!r.votes[p.id]})),voteCount:Object.keys(r.votes).length,total:Object.keys(r.players).length,accused:r.accused?{id:r.accused,name:r.players[r.accused]?.name,photo:r.players[r.accused]?.photo}:null,results:r.results||null,category:r.category||null};}
function emit(r){io.to(r.code).emit("state",pub(r));}
function top(r){let c={};Object.values(r.votes).forEach(v=>c[v]=(c[v]||0)+1); let mx=Math.max(0,...Object.values(c)); return {counts:c,ids:Object.keys(c).filter(k=>c[k]===mx),max:mx};}
io.on("connection",s=>{
 s.on("create",d=>{let c=code();rooms[c]={code:c,host:s.id,players:{},phase:"lobby",votes:{},results:null};rooms[c].players[s.id]={id:s.id,name:d.name,photo:d.photo};s.join(c);s.data.room=c;emit(rooms[c]);});
 s.on("join",d=>{let r=rooms[(d.code||"").toUpperCase()];if(!r)return s.emit("err","Sala não encontrada.");if(r.phase!=="lobby")return s.emit("err","A partida já começou.");r.players[s.id]={id:s.id,name:d.name,photo:d.photo};s.join(r.code);s.data.room=r.code;emit(r);});
 s.on("start",()=>{let r=rooms[s.data.room];if(!r||r.host!==s.id)return;if(Object.keys(r.players).length<3)return s.emit("err","São necessários pelo menos 3 jogadores.");let [cat,normal,spy]=pairs[Math.floor(Math.random()*pairs.length)], ids=Object.keys(r.players);r.spy=ids[Math.floor(Math.random()*ids.length)];r.category=cat;r.normal=normal;r.spyword=spy;r.phase="discussion";r.votes={};r.results=null;r.accused=null;ids.forEach(id=>io.to(id).emit("secret",{word:id===r.spy?spy:normal,category:cat}));emit(r);});
 s.on("speaking",v=>{let r=rooms[s.data.room];if(r) s.to(r.code).emit("speaking",{id:s.id,on:!!v});});
 s.on("vote",id=>{let r=rooms[s.data.room];if(!r||!["vote1","vote2"].includes(r.phase)||r.votes[s.id]||!r.players[id])return;r.votes[s.id]=id;emit(r);if(Object.keys(r.votes).length===Object.keys(r.players).length)io.to(r.code).emit("allVoted");});
 s.on("beginVote1",()=>{let r=rooms[s.data.room];if(r&&r.host===s.id){r.phase="vote1";r.votes={};r.results=null;emit(r);}});
 s.on("hostOk1",()=>{let r=rooms[s.data.room];if(!r||r.host!==s.id||r.phase!=="vote1"||Object.keys(r.votes).length<Object.keys(r.players).length)return;let t=top(r);r.results=t.counts;r.accused=t.ids[0];r.phase="defense";emit(r);});
 s.on("beginVote2",()=>{let r=rooms[s.data.room];if(r&&r.host===s.id&&r.phase==="defense"){r.phase="vote2";r.votes={};r.results=null;emit(r);}});
 s.on("reveal",()=>{let r=rooms[s.data.room];if(!r||r.host!==s.id||r.phase!=="vote2"||Object.keys(r.votes).length<Object.keys(r.players).length)return;r.results=top(r).counts;r.phase="reveal";emit(r);io.to(r.code).emit("revealData",{spy:r.players[r.spy],normal:r.normal,spyword:r.spyword});});
 s.on("newRound",()=>{let r=rooms[s.data.room];if(r&&r.host===s.id){r.phase="lobby";r.votes={};r.results=null;r.accused=null;r.spy=null;emit(r);}});

 s.on("rtcOffer",d=>{let r=rooms[s.data.room];if(r&&r.players[d.to])io.to(d.to).emit("rtcOffer",{from:s.id,sdp:d.sdp});});
 s.on("rtcAnswer",d=>{let r=rooms[s.data.room];if(r&&r.players[d.to])io.to(d.to).emit("rtcAnswer",{from:s.id,sdp:d.sdp});});
 s.on("rtcIce",d=>{let r=rooms[s.data.room];if(r&&r.players[d.to])io.to(d.to).emit("rtcIce",{from:s.id,candidate:d.candidate});});
 s.on("disconnect",()=>{let r=rooms[s.data.room];if(!r)return;delete r.players[s.id];if(!Object.keys(r.players).length){delete rooms[r.code];return}if(r.host===s.id)r.host=Object.keys(r.players)[0];emit(r);});
});
server.listen(process.env.PORT||3000,()=>console.log("QUEM É O ESPIÃO V4 em http://localhost:"+(process.env.PORT||3000)));
