(function(){
"use strict";
function $(id){return document.getElementById(id);}
var STORE_TRADES="tjv5_trades", STORE_ACCOUNT="tjv5_account", STORE_SETUPS="tjv5_setups", STORE_SYMBOLS="tjv5_symbols";
var account={name:"Main Trading Account",startingBalance:1000,currency:"USD",type:"Mixed",startDate:"",feeRate:0.005};
var trades=[];
var setups=[];
var symbols=[];
var editingId=null;

function load(){
  try{
    var a=localStorage.getItem(STORE_ACCOUNT); if(a) account=Object.assign(account,JSON.parse(a));
    var t=localStorage.getItem(STORE_TRADES); if(t) trades=JSON.parse(t)||[];
    var su=localStorage.getItem(STORE_SETUPS); if(su) setups=JSON.parse(su)||setups;
    var sy=localStorage.getItem(STORE_SYMBOLS); if(sy) symbols=JSON.parse(sy)||symbols;
    trades.forEach(function(x){if(x.setup && setups.indexOf(x.setup)<0)setups.push(x.setup);if(x.symbol && symbols.indexOf(x.symbol)<0)symbols.push(x.symbol);});
  }catch(e){$("storageStatus").textContent="Storage blocked"; console.error(e);}
}
function persist(){
  localStorage.setItem(STORE_ACCOUNT,JSON.stringify(account));
  localStorage.setItem(STORE_TRADES,JSON.stringify(trades));
  localStorage.setItem(STORE_SETUPS,JSON.stringify(setups));
  localStorage.setItem(STORE_SYMBOLS,JSON.stringify(symbols));
  $("storageStatus").textContent="Saved locally";
}
function money(n){
  n=Number(n)||0; var neg=n<0?"-":""; var x=Math.abs(n).toFixed(2);
  if(account.currency==="USDT") return neg+x+" USDT";
  var s={USD:"$",EUR:"€",GBP:"£"}[account.currency]||"";
  return neg+s+x;
}
function riskAmount(){
  var v=Number($("riskValue").value)||0;
  return $("riskType").value==="percent" ? Number(account.startingBalance||0)*v/100 : v;
}
function qty(){
  var e=Number($("entry").value), s=Number($("stop").value), r=riskAmount();
  if(!isFinite(e)||!isFinite(s)||r<=0||Math.abs(e-s)===0) return 0;
  return r/Math.abs(e-s);
}
function grossPnl(){
  var e=Number($("entry").value), x=Number($("exit").value), q=qty();
  if(!isFinite(e)||!isFinite(x)||q<=0) return 0;
  return $("side").value==="Short" ? (e-x)*q : (x-e)*q;
}
function fees(){
  var e=Number($("entry").value), x=Number($("exit").value), q=qty(), rate=(Number($("feeRate").value)||0)/100;
  if(!isFinite(e)||!isFinite(x)||q<=0) return 0;
  return (Math.abs(e*q)+Math.abs(x*q))*rate;
}
function plannedRR(){
  var e=Number($("entry").value), s=Number($("stop").value), t=Number($("target").value);
  if(!isFinite(e)||!isFinite(s)||!isFinite(t)||Math.abs(e-s)===0) return null;
  var reward=$("side").value==="Short" ? e-t : t-e;
  return reward/Math.abs(e-s);
}
function recalcForm(){
  $("riskLabel").textContent=$("riskType").value==="percent"?"Risk %":"Risk Amount";
  var r=riskAmount(), q=qty(), gp=grossPnl(), f=fees(), np=gp-f, pr=plannedRR();
  $("riskAmount").value=money(r);
  $("quantity").value=q>0?q.toFixed(6):"";
  $("grossPnl").value=money(gp);
  $("fees").value=money(f);
  $("netPnl").value=money(np);
  $("plannedRR").value=pr===null?"—":"1 : "+pr.toFixed(2);
  $("realizedR").value=r>0?(np/r).toFixed(2)+"R":"—";
}
function flash(id,text){
  var el=$(id); el.textContent=text; el.style.display="block";
  setTimeout(function(){el.style.display="none";},1600);
}
function readTrade(){
  var r=riskAmount(), q=qty(), gp=grossPnl(), f=fees(), np=gp-f, pr=plannedRR();
  return {
    id:editingId||Date.now(), date:$("date").value, market:$("market").value, symbol:$("symbol").value.trim().toUpperCase(),
    side:$("side").value, setup:$("setup").value.trim(), entry:numOrNull($("entry").value), exit:numOrNull($("exit").value),
    stop:numOrNull($("stop").value), target:numOrNull($("target").value), riskType:$("riskType").value,
    riskValue:Number($("riskValue").value)||0, risk:r, quantity:q, feeRate:Number($("feeRate").value)||0,
    fees:f, grossPnl:gp, pnl:np, plannedRR:pr, realizedR:r>0?np/r:null, plan:$("plan").value, notes:$("notes").value.trim()
  };
}
function numOrNull(v){return v===""?null:Number(v);}
function saveTrade(){
  var t=readTrade();
  if(!t.date||!t.symbol||!t.setup||!(t.risk>0)||t.entry===null||t.stop===null){
    alert("Date, Symbol, Setup, Entry, Stop Loss and Risk are required."); return;
  }
  if(t.symbol && symbols.indexOf(t.symbol)<0) symbols.push(t.symbol);
  if(t.setup && setups.indexOf(t.setup)<0) setups.push(t.setup);
  refreshSymbolList();
  if(editingId){
    for(var i=0;i<trades.length;i++){if(String(trades[i].id)===String(editingId)){trades[i]=t;break;}}
    flash("tradeFlash","Trade updated ✓");
  }else{trades.push(t);flash("tradeFlash","Trade saved ✓");}
  editingId=null; persist(); resetTradeForm(); renderAll();
}
function editTrade(id){
  var t=trades.find(function(x){return String(x.id)===String(id);}); if(!t)return;
  editingId=t.id; $("tradeFormTitle").textContent="ویرایش معامله"; $("cancelWrap").style.display="block";
  ["date","market","symbol","side","setup","plan","notes"].forEach(function(k){$(k).value=t[k]||"";});
  [["entry",t.entry],["exit",t.exit],["stop",t.stop],["target",t.target],["riskValue",t.riskValue],["feeRate",t.feeRate]].forEach(function(a){$(a[0]).value=a[1]==null?"":a[1];});
  $("riskType").value=t.riskType||"amount"; recalcForm(); window.scrollTo(0,0);
}
function deleteTrade(id){
  if(!confirm("Delete this trade?"))return;
  trades=trades.filter(function(x){return String(x.id)!==String(id);}); persist(); renderAll();
}
function resetTradeForm(){
  editingId=null; $("tradeFormTitle").textContent="ثبت معامله جدید"; $("cancelWrap").style.display="none";
  $("date").value=new Date().toISOString().slice(0,10); $("market").value="Crypto"; $("symbol").value=""; $("side").value="Long";
  refreshSymbolList(); refreshSetupSelect(); $("setup").value=""; ["entry","exit","stop","target","notes"].forEach(function(k){$(k).value="";});
  $("riskType").value="amount"; $("riskValue").value="5"; $("feeRate").value=account.feeRate||0.005; $("plan").value="Yes"; recalcForm();
}
function stats(){
  var sb=Number(account.startingBalance)||0, bal=sb, gp=0, gl=0, wins=0, losses=0, be=0, feesTotal=0, peak=sb, maxDD=0, sumR=0;
  trades.slice().sort(function(a,b){return String(a.date).localeCompare(String(b.date));}).forEach(function(t){
    bal+=Number(t.pnl)||0; feesTotal+=Number(t.fees)||0; var p=Number(t.pnl)||0;
    if(p>0){wins++;gp+=p;} else if(p<0){losses++;gl+=Math.abs(p);} else be++;
    if(Number.isFinite(Number(t.realizedR)))sumR+=Number(t.realizedR);
    if(bal>peak)peak=bal; var dd=peak-bal; if(dd>maxDD)maxDD=dd;
  });
  var total=trades.length, wr=total?wins/total*100:0, pf=gl?gp/gl:(gp>0?Infinity:0), net=bal-sb;
  return {sb:sb,bal:bal,net:net,gp:gp,gl:gl,wins:wins,losses:losses,be:be,total:total,wr:wr,pf:pf,fees:feesTotal,maxDD:maxDD,avgR:total?sumR/total:0};
}
function metric(k,v,c){return '<div class="metric"><div class="k">'+k+'</div><div class="v '+(c||"")+'">'+v+'</div></div>';}
function renderStatement(){
  var s=stats(); $("currentBalance").value=money(s.bal);
  $("statementMetrics").innerHTML=
   metric("Starting Balance",money(s.sb))+metric("Current Balance",money(s.bal),s.net>=0?"pos":"neg")+metric("Net P&L",money(s.net),s.net>=0?"pos":"neg")+
   metric("Total Trades",s.total)+metric("Win Rate",s.wr.toFixed(1)+"%")+metric("Profit Factor",s.pf===Infinity?"∞":s.pf.toFixed(2))+
   metric("Avg Realized R",s.avgR.toFixed(2)+"R",s.avgR>=0?"pos":"neg")+metric("Max Drawdown",money(-s.maxDD),"neg")+
   metric("Gross Profit",money(s.gp),"pos")+metric("Gross Loss",money(-s.gl),"neg")+metric("Total Fees",money(s.fees),"gold")+
   metric("Return on Start",s.sb?((s.net/s.sb)*100).toFixed(2)+"%":"—",s.net>=0?"pos":"neg");
}
function renderTrades(){
  $("tradeCount").textContent=trades.length+" trades";
  var arr=trades.slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
  $("tradeBody").innerHTML=arr.map(function(t){
    return "<tr><td>"+t.date+"</td><td>"+t.market+"</td><td><b>"+t.symbol+"</b></td><td>"+t.side+"</td><td>"+t.setup+"</td>"+
    "<td>"+val(t.entry)+"</td><td>"+val(t.exit)+"</td><td>"+val(t.stop)+"</td><td>"+val(t.target)+"</td><td>"+money(t.risk)+"</td><td>"+Number(t.quantity||0).toFixed(4)+"</td>"+
    "<td>"+money(t.fees)+"</td><td class='"+((t.pnl||0)>=0?"pos":"neg")+"'><b>"+money(t.pnl)+"</b></td><td>"+(t.plannedRR==null?"—":"1 : "+Number(t.plannedRR).toFixed(2))+"</td>"+
    "<td>"+(t.realizedR==null?"—":Number(t.realizedR).toFixed(2)+"R")+"</td><td>"+t.plan+"</td><td><div class='actions'><button class='btn ghost mini' data-edit='"+t.id+"'>Edit</button><button class='btn danger mini' data-del='"+t.id+"'>Delete</button></div></td></tr>";
  }).join("") || "<tr><td colspan='17'>No trades yet.</td></tr>";
  document.querySelectorAll("[data-edit]").forEach(function(b){b.onclick=function(){editTrade(this.getAttribute("data-edit"));};});
  document.querySelectorAll("[data-del]").forEach(function(b){b.onclick=function(){deleteTrade(this.getAttribute("data-del"));};});
}
function val(x){return x==null?"—":x;}

function normalizeSymbol(v){return String(v||"").trim().toUpperCase();}
function refreshSymbolList(){
  var dl=$("symbolList"); if(!dl)return;
  var all=symbols.map(normalizeSymbol).filter(function(x,i,a){return x&&a.indexOf(x)===i;}).sort();
  dl.innerHTML=all.map(function(x){return "<option value='"+escapeHtml(x)+"'></option>";}).join("");
}
function addSymbol(){
  var n=normalizeSymbol($("newSymbol").value); if(!n)return;
  if(symbols.map(normalizeSymbol).indexOf(n)>=0){alert("This symbol already exists.");return;}
  symbols.push(n); $("newSymbol").value=""; persist(); refreshSymbolList(); renderSymbols();
}
function removeSymbol(name){
  var n=normalizeSymbol(name);
  if(!confirm("Remove "+n+" from future suggestions? Historical trades will stay unchanged."))return;
  symbols=symbols.filter(function(x){return normalizeSymbol(x)!==n;});
  persist(); refreshSymbolList(); renderSymbols();
}
function renderSymbols(){
  var box=$("symbolChips"); if(!box)return;
  var all=symbols.map(normalizeSymbol).filter(function(x,i,a){return x&&a.indexOf(x)===i;}).sort();
  box.innerHTML=all.map(function(x){return "<span class='chip'>"+escapeHtml(x)+" <button data-rmsymbol='"+encodeURIComponent(x)+"' title='Remove from suggestions'>×</button></span>";}).join("") || "<span class='hint'>No saved symbols yet.</span>";
  document.querySelectorAll("[data-rmsymbol]").forEach(function(b){b.onclick=function(){removeSymbol(decodeURIComponent(this.getAttribute("data-rmsymbol")));};});
}
function refreshSetupSelect(){
  var sel=$("setup"); if(!sel)return; var current=sel.value;
  var all=setups.slice(); trades.forEach(function(t){if(t.setup&&all.indexOf(t.setup)<0)all.push(t.setup);});
  sel.innerHTML=all.map(function(x){return "<option>"+escapeHtml(x)+"</option>";}).join("");
  if(current&&all.indexOf(current)>=0)sel.value=current;
}
function escapeHtml(x){return String(x).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function addSetup(){var n=$("newSetup").value.trim();if(!n)return;if(setups.map(function(x){return x.toLowerCase();}).indexOf(n.toLowerCase())>=0){alert("This setup already exists.");return;}setups.push(n);$("newSetup").value="";persist();refreshSetupSelect();renderSetups();}
function removeSetup(name){setups=setups.filter(function(x){return x!==name;});persist();refreshSetupSelect();renderSetups();}
function renderSetups(){
  var map={}; trades.forEach(function(t){var k=t.setup||"Unknown"; if(!map[k])map[k]=[];map[k].push(t);});
  $("setupChips").innerHTML=setups.map(function(x){return "<span class='chip'>"+escapeHtml(x)+" <button data-rmsetup='"+encodeURIComponent(x)+"' title='Remove from choices'>×</button></span>";}).join("");
  document.querySelectorAll("[data-rmsetup]").forEach(function(b){b.onclick=function(){removeSetup(decodeURIComponent(this.getAttribute("data-rmsetup")));};});
  var keys=Object.keys(map);
  var html=keys.map(function(k){var a=map[k],wins=0,gp=0,gl=0,net=0,sumR=0,peak=0,cum=0,maxDD=0;
    a.slice().sort(function(x,y){return String(x.date).localeCompare(String(y.date));}).forEach(function(t){var p=Number(t.pnl)||0,r=Number(t.realizedR)||0;if(p>0){wins++;gp+=p;}else if(p<0)gl+=Math.abs(p);net+=p;sumR+=r;cum+=p;if(cum>peak)peak=cum;if(peak-cum>maxDD)maxDD=peak-cum;});
    var n=a.length,wr=n?wins/n*100:0,avgR=n?sumR/n:0,pf=gl?gp/gl:(gp>0?Infinity:0),expectancy=avgR;
    var evidence=n<10?"Need more data":(n<20?"Preliminary":(expectancy>0&&pf>1?"Positive edge":"No edge yet"));
    return "<div class='setupRow'><b>"+escapeHtml(k)+"</b><span>"+n+" trades</span><span>"+wr.toFixed(0)+"% WR</span><span>"+money(net)+" Net</span><span>"+avgR.toFixed(2)+"R Exp</span><span>PF "+(pf===Infinity?"∞":pf.toFixed(2))+"</span><span>DD "+money(-maxDD)+"</span><span>"+evidence+"</span></div>";
  }).join("");
  $("setupList").innerHTML=html||"<div class='note'>هنوز معامله‌ای برای تحلیل Edge ثبت نشده است.</div>";
}
function drawCharts(){
  var ordered=trades.slice().sort(function(a,b){return String(a.date).localeCompare(String(b.date));});
  var s=Number(account.startingBalance)||0, eq=[s], pnls=[];
  ordered.forEach(function(t){s+=Number(t.pnl)||0;eq.push(s);pnls.push(Number(t.pnl)||0);});
  drawLine($("equityChart"),eq); drawBars($("pnlChart"),pnls);
}
function prepCanvas(c){var dpr=window.devicePixelRatio||1, w=c.clientWidth||900, h=260;c.width=w*dpr;c.height=h*dpr;var ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx:ctx,w:w,h:h};}
function drawLine(c,data){var o=prepCanvas(c),ctx=o.ctx,w=o.w,h=o.h;ctx.clearRect(0,0,w,h);ctx.strokeStyle="#223950";for(var i=0;i<5;i++){var y=20+i*(h-40)/4;ctx.beginPath();ctx.moveTo(30,y);ctx.lineTo(w-10,y);ctx.stroke();}
 if(data.length<2)return;var mn=Math.min.apply(null,data),mx=Math.max.apply(null,data);if(mx===mn)mx=mn+1;ctx.strokeStyle="#6d78ff";ctx.lineWidth=3;ctx.beginPath();data.forEach(function(v,i){var x=30+i*(w-45)/(data.length-1),y=20+(mx-v)*(h-40)/(mx-mn);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();}
function drawBars(c,data){var o=prepCanvas(c),ctx=o.ctx,w=o.w,h=o.h;ctx.clearRect(0,0,w,h);var max=Math.max(1,Math.max.apply(null,data.map(function(v){return Math.abs(v);})));var mid=h/2;ctx.strokeStyle="#5b6d82";ctx.beginPath();ctx.moveTo(30,mid);ctx.lineTo(w-10,mid);ctx.stroke();if(!data.length)return;var bw=Math.max(3,(w-50)/data.length*.6);data.forEach(function(v,i){var x=35+i*(w-45)/data.length,hh=Math.abs(v)/max*(h*.38);ctx.fillStyle=v>=0?"#22d394":"#ff647c";ctx.fillRect(x,v>=0?mid-hh:mid,bw,hh);});}
function renderDashboard(){var s=stats();$("dashMetrics").innerHTML=metric("Balance",money(s.bal))+metric("Net P&L",money(s.net),s.net>=0?"pos":"neg")+metric("Win Rate",s.wr.toFixed(1)+"%")+metric("Profit Factor",s.pf===Infinity?"∞":s.pf.toFixed(2))+metric("Avg R",s.avgR.toFixed(2)+"R")+metric("Max DD",money(-s.maxDD),"neg")+metric("Trades",s.total)+metric("Fees",money(s.fees),"gold");drawCharts();}
function renderAll(){refreshSymbolList();renderSymbols();refreshSetupSelect();renderTrades();renderStatement();renderSetups();renderDashboard();}
function loadAccountForm(){
 $("accountName").value=account.name||"";$("startingBalance").value=account.startingBalance;$("currency").value=account.currency;$("accountType").value=account.type;$("startDate").value=account.startDate||"";$("defaultFeeRate").value=account.feeRate||0.005;
}
function saveAccount(){
 account.name=$("accountName").value.trim()||"Main Trading Account";account.startingBalance=Number($("startingBalance").value)||0;account.currency=$("currency").value;account.type=$("accountType").value;account.startDate=$("startDate").value;account.feeRate=Number($("defaultFeeRate").value)||0;
 persist();$("feeRate").value=account.feeRate;recalcForm();renderAll();flash("accountFlash","Account settings saved ✓");
}
function download(name,text,type){var blob=new Blob([text],{type:type||"text/plain"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(url);},500);}
function exportJSON(){download("Trade_Journal_V5_3_Backup.json",JSON.stringify({version:"5.3",account:account,trades:trades,setups:setups,symbols:symbols},null,2),"application/json");}
function csvCell(x){x=x==null?"":String(x);return '"'+x.replace(/"/g,'""')+'"';}
function exportCSV(){var head=["Date","Market","Symbol","Side","Setup","Entry","Exit","Stop","Target","Risk","Quantity","Fee Rate %","Fees","Gross P&L","Net P&L","Planned RR","Realized R","Plan","Notes"];var rows=[head].concat(trades.map(function(t){return [t.date,t.market,t.symbol,t.side,t.setup,t.entry,t.exit,t.stop,t.target,t.risk,t.quantity,t.feeRate,t.fees,t.grossPnl,t.pnl,t.plannedRR,t.realizedR,t.plan,t.notes];}));download("Trade_Journal_V5.csv",rows.map(function(r){return r.map(csvCell).join(",");}).join("\n"),"text/csv");}
function importJSON(file){var r=new FileReader();r.onload=function(){try{var d=JSON.parse(r.result);if(d.account)account=Object.assign(account,d.account);if(Array.isArray(d.trades))trades=d.trades;if(Array.isArray(d.setups))setups=d.setups;if(Array.isArray(d.symbols))symbols=d.symbols;trades.forEach(function(t){var x=normalizeSymbol(t.symbol);if(x&&symbols.indexOf(x)<0)symbols.push(x);});persist();loadAccountForm();resetTradeForm();renderAll();alert("Backup imported.");}catch(e){alert("Invalid backup file.");}};r.readAsText(file);}
function bind(){
 document.querySelectorAll(".tab").forEach(function(b){b.onclick=function(){var v=this.getAttribute("data-view");document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("active");});document.querySelectorAll(".view").forEach(function(x){x.classList.remove("active");});this.classList.add("active");$(v).classList.add("active");if(v==="dashboard")setTimeout(drawCharts,50);};});
 ["entry","exit","stop","target","riskValue","feeRate"].forEach(function(id){$(id).addEventListener("input",recalcForm);});$("side").addEventListener("change",recalcForm);$("riskType").addEventListener("change",recalcForm);
 $("saveTradeBtn").onclick=saveTrade;$("addSymbolBtn").onclick=addSymbol;$("newSymbol").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();addSymbol();}});$("addSetupBtn").onclick=addSetup;$("newSetup").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();addSetup();}});$("cancelEditBtn").onclick=resetTradeForm;$("saveAccountBtn").onclick=saveAccount;$("exportJson").onclick=exportJSON;$("exportCsv").onclick=exportCSV;
 $("importJson").onchange=function(){if(this.files&&this.files[0])importJSON(this.files[0]);};
 $("clearAll").onclick=function(){if(confirm("Delete ALL trades?")){trades=[];persist();renderAll();}};
 window.addEventListener("resize",function(){if($("dashboard").classList.contains("active"))drawCharts();});
}
load();loadAccountForm();resetTradeForm();bind();renderAll();
if("serviceWorker" in navigator && location.protocol.indexOf("http")===0){navigator.serviceWorker.register("service-worker.js").catch(function(e){console.warn("SW",e);});}
})();