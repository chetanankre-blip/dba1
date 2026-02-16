
(function(){
  var LS_KEY="dolphin_state";

  function loadState(){
    try { return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); } catch(e){ return {}; }
  }
  function saveState(st){
    localStorage.setItem(LS_KEY, JSON.stringify(st));
  }
  function norm(s){ return (s||"").toString().trim(); }
  function normType(t){
    t = (t||"").toString().trim().toUpperCase();
    if(t==="S"||t==="SINGLES"||t==="SINGLE") return "S";
    if(t==="D"||t==="DOUBLES"||t==="DOUBLE") return "D";
    return "";
  }
  function isSeed(x){ return /^[0-9]{1,3}$/.test((x||"").toString().trim()); }

  
  function splitSmart(raw){
    var s=(raw||"").toString().trim();
    if(!s) return [];
    var parts=s.split(/\t|,|\|/);
    if(parts.length===1){
      parts=s.split(/\s{2,}/);
    }
    return parts.map(function(p){return p.trim();}).filter(function(p){return p.length>0;});
  }
  function normLower(s){ return (s||"").toString().trim().toLowerCase(); }
  function looksType(t){
    var v=normLower(t);
    return v==="s"||v==="singles"||v==="single"||v==="d"||v==="doubles"||v==="double";
  }
  function toType(t){
    var v=normLower(t);
    if(v==="s"||v==="singles"||v==="single") return "S";
    if(v==="d"||v==="doubles"||v==="double") return "D";
    return "";
  }
  function looksSeed(t){ return /^[0-9]{1,3}$/.test((t||"").toString().trim()); }
  function parseLine(line){
    var raw=(line||"").toString().trim();
    if(!raw) return null;
    var parts=splitSmart(raw);

    // Type can be anywhere, with or without spaces
    var type="", typeIdx=-1;
    for(var i=0;i<parts.length;i++){
      if(looksType(parts[i])){ type=toType(parts[i]); typeIdx=i; break; }
    }
    if(typeIdx>=0) parts.splice(typeIdx,1);

    // Seed can be anywhere
    var seed="", seedIdx=-1;
    for(var j=0;j<parts.length;j++){
      if(looksSeed(parts[j])){ seed=parts[j].trim(); seedIdx=j; break; }
    }
    if(seedIdx>=0) parts.splice(seedIdx,1);

    var category="Open";
    if(parts.length>=2){
      category=parts[0];
      parts=parts.slice(1);
    }

    // Infer type if missing
    if(!type) type = (parts.length>=2) ? "D" : "S";

    var name1="", name2="", academy="";
    if(type==="S"){
      name1=parts[0]||"";
      academy=parts.slice(1).join(" ");
    }else{
      name1=parts[0]||"";
      name2=parts[1]||"";
      academy=parts.slice(2).join(" ");
    }

    category=norm(category)||"Open";
    name1=norm(name1); name2=norm(name2); academy=norm(academy);
    if(!name1) return null;
    if(type==="D" && !name2) return null;

    return {category:category,type:type,name1:name1,name2:name2,seed:seed||"",academy:academy||""};
  }


  function uid(){
    return "M" + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4);
  }

  function byCategory(entries){
    var map={};
    entries.forEach(function(e){
      if(!map[e.category]) map[e.category]=[];
      map[e.category].push(e);
    });
    return map;
  }

  
  // ===== v9 Dual PIN Security (Admin + Referee) =====
  function getPins(){
    return {
      admin: localStorage.getItem("pin_admin") || "2468",
      ref: localStorage.getItem("pin_ref") || "1357"
    };
  }
  function setPins(adminPin, refPin){
    if(adminPin) localStorage.setItem("pin_admin", adminPin);
    if(refPin) localStorage.setItem("pin_ref", refPin);
  }
  function isUnlocked(role){
    var k = role==="admin" ? "unlocked_admin" : "unlocked_ref";
    return sessionStorage.getItem(k)==="1";
  }
  function lockAll(){
    sessionStorage.removeItem("unlocked_admin");
    sessionStorage.removeItem("unlocked_ref");
  }
  function requireRole(role){
    if(isUnlocked(role)) return true;
    var pins=getPins();
    var expected = role==="admin" ? pins.admin : pins.ref;
    var label = role==="admin" ? "Admin PIN" : "Referee PIN";
    var got = prompt("Enter "+label+":");
    if(got===null) return false;
    got = (got||"").trim();
    if(got === expected){
      sessionStorage.setItem(role==="admin" ? "unlocked_admin" : "unlocked_ref", "1");
      return true;
    }
    alert("Wrong PIN");
    return false;
  }

function safeSel(id){ return document.getElementById(id); }

  function setActiveTab(tabId){
    // Security: protect tabs
    if(tabId==="settings" || tabId==="schedule" || tabId==="draw"){
      if(!requireRole("admin")) return;
    }
    if(tabId==="controller"){
      if(!requireRole("ref")) return;
    }

    var tabs=document.querySelectorAll("section.tab");
    for(var i=0;i<tabs.length;i++) tabs[i].classList.remove("active");
    var t=document.getElementById(tabId);
    if(t) t.classList.add("active");

    var btns=document.querySelectorAll(".tabs button");
    for(var j=0;j<btns.length;j++){
      btns[j].classList.toggle("active", btns[j].getAttribute("data-tab")===tabId);
    }
  }

  function renderEntries(){
    var st=loadState();
    var entries=st.entries||[];
    var tbody=safeSel("tblEntries").querySelector("tbody");
    tbody.innerHTML="";
    for(var i=0;i<entries.length;i++){
      var e=entries[i];
      var tr=document.createElement("tr");
      tr.innerHTML =
        "<td>"+(i+1)+"</td>"+
        "<td>"+esc(e.category)+"</td>"+
        "<td>"+esc(e.type)+"</td>"+
        "<td>"+esc(e.name1)+"</td>"+
        "<td>"+esc(e.name2||"")+"</td>"+
        "<td>"+esc(e.seed||"")+"</td>"+
        "<td>"+esc(e.academy||"")+"</td>"+
        "<td><button class='ghost' data-del='"+i+"'>Del</button></td>";
      tbody.appendChild(tr);
    }
    safeSel("statEntries").textContent = entries.length + " entries";
    // categories dropdown
    var catSel=safeSel("drawCategory");
    catSel.innerHTML="";
    var cats = Object.keys(byCategory(entries));
    if(cats.length===0){
      var opt=document.createElement("option"); opt.value=""; opt.textContent="(no entries)";
      catSel.appendChild(opt);
    } else {
      cats.forEach(function(c){
        var opt=document.createElement("option"); opt.value=c; opt.textContent=c;
        catSel.appendChild(opt);
      });
    }
    // controller match dropdown
    renderCtlMatchDropdown();
  }

  function esc(s){
    return (s||"").toString().replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function importFromPaste(){
    var lines = (safeSel("pasteBox").value||"").split(/\r?\n/);
    var items=[];
    for(var i=0;i<lines.length;i++){
      var e=parseLine(lines[i]);
      if(e) items.push(e);
    }
    var st=loadState();
    st.entries = (st.entries||[]).concat(items);
    saveState(st);
    renderEntries();
  }

  function manualAdd(){
    var e = {
      category: norm(safeSel("manCategory").value) || "Open",
      type: safeSel("manType").value,
      name1: norm(safeSel("manName1").value),
      name2: norm(safeSel("manName2").value),
      seed: norm(safeSel("manSeed").value),
      academy: norm(safeSel("manAcademy").value)
    };
    if(!e.name1) return alert("Enter Name 1");
    if(e.type==="D" && !e.name2) return alert("Enter Name 2 for doubles");
    var st=loadState(); st.entries = (st.entries||[]).concat([e]); saveState(st);
    safeSel("manName1").value=""; safeSel("manName2").value=""; safeSel("manSeed").value=""; 
    renderEntries();
  }

  function deleteEntry(idx){
    var st=loadState();
    st.entries = (st.entries||[]);
    st.entries.splice(idx,1);
    saveState(st);
    renderEntries();
  }

  // DRAW
  function generateKO(list){
    // sort by seed if present (1..)
    var seeded=list.slice().sort(function(a,b){
      var sa=parseInt(a.seed||"9999",10); var sb=parseInt(b.seed||"9999",10);
      if(sa!==sb) return sa-sb;
      return (a.name1||"").localeCompare(b.name1||"");
    });
    var n=seeded.length;
    var pow=1;
    while(pow<n) pow*=2;
    var byes = pow-n;
    // build first round slots
    var slots = seeded.map(function(e){ return e; });
    for(var i=0;i<byes;i++) slots.push(null); // bye slots
    return {pow:pow, byes:byes, slots:slots};
  }

  function generateRR(list){
    // circle method (singles only, but works for doubles as pairs)
    var teams=list.slice();
    var n=teams.length;
    if(n<2) return [];
    if(n%2===1){ teams.push(null); n++; }
    var rounds=n-1;
    var half=n/2;
    var res=[];
    for(var r=0;r<rounds;r++){
      for(var i=0;i<half;i++){
        var t1=teams[i], t2=teams[n-1-i];
        if(t1 && t2){
          res.push({round:r+1, a:t1, b:t2});
        }
      }
      // rotate
      var fixed=teams[0];
      var rest=teams.slice(1);
      rest.unshift(rest.pop());
      teams=[fixed].concat(rest);
    }
    return res;
  }

  
  
function renderBracketKO(matches){
    var st=loadState();
    var sch=(st.schedule||[]);
    var schMap={};
    for(var si=0; si<sch.length; si++){ schMap[sch[si].id]=sch[si].slot; }
    st.scores = st.scores || {};
    var scoreMap = st.scores;

    var r1 = (matches||[]).filter(function(m){ return (m.round||1)===1; });
    if(r1.length===0) return "<div class='hint'>No matches</div>";
    var size = r1.length * 2;
    var rounds = Math.round(Math.log(size)/Math.log(2));
    if(!isFinite(rounds) || rounds<1) rounds=1;

    function winnerDot(id, which){
      var sc=scoreMap[id];
      if(!sc) return "<span class='bwfDot off'></span>";
      var w = (sc.s1||0)=== (sc.s2||0) ? "" : ((sc.s1||0)>(sc.s2||0) ? "p1":"p2");
      if(!w) return "<span class='bwfDot off'></span>";
      var ok = (which===w);
      return ok ? "<span class='bwfDot'></span>" : "<span class='bwfDot off'></span>";
    }
    function scoreText(id, which){
      var sc=scoreMap[id];
      if(!sc) return "";
      var a = sc.s1||0, b=sc.s2||0;
      return which==="p1" ? (a? String(a):"") : (b? String(b):"");
    }
    function metaText(id){
      var slot = schMap[id];
      if(!slot) return "";
      var t = (slot.date||"") + " " + (slot.start||"") + "-" + (slot.end||"");
      var p = (slot.venue? (slot.venue+" • "):"") + (slot.court||"");
      return "<div class='bwfMeta'><span>🕒 "+esc(t).replace(/^\s+|\s+$/g,'')+"</span><span>📍 "+esc(p).replace(/^\s+|\s+$/g,'')+"</span></div>";
    }

    // build rounds
    var cols=[];
    for(var r=1;r<=rounds;r++) cols.push([]);

    r1.forEach(function(m, idx){
      cols[0].push({
        id:m.id,
        a:entryLabel(m.a),
        b:(m.bye ? "Bye" : entryLabel(m.b)),
        bye:!!m.bye,
        seed1:(idx*2)+1,
        seed2:(idx*2)+2
      });
    });

    for(var rr=2; rr<=rounds; rr++){
      var prev=cols[rr-2].length;
      var cnt=Math.ceil(prev/2);
      for(var k=0;k<cnt;k++){
        cols[rr-1].push({
          id:"R"+rr+"M"+(k+1),
          a:"Winner",
          b:"Winner",
          seed1:"",
          seed2:""
        });
      }
    }

    function roundTitle(i){
      if(i===0 && rounds>=3) return "Quarter final";
      if(i===0 && rounds===2) return "Semi final";
      if(i===0 && rounds===1) return "Final";
      if(i===1 && rounds>=3) return "Semi final";
      if(i===rounds-1) return "Final";
      return "Round "+(i+1);
    }

    var html = "<div class='bwfBracketWrap'><div class='bwfBracket'>";
    for(var c=0;c<cols.length;c++){
      html += "<div class='bwfRound'><div class='bwfRoundTitle'>"+roundTitle(c)+"</div>";
      for(var m=0;m<cols[c].length;m++){
        var mm=cols[c][m];
        var conn = (c<cols.length-1) ? " bwfConnRight" : "";
        // add vertical connector for pairing (visual)
        if(c<cols.length-1){
          if(m%2===0) conn += " bwfConnDown";
          else conn += " bwfConnUp";
        }
        var id=mm.id;
        var sc1=scoreText(id,"p1"), sc2=scoreText(id,"p2");
        var dot1=winnerDot(id,"p1"), dot2=winnerDot(id,"p2");
        var n1=mm.a || "";
        var n2=mm.b || "";
        var muted2 = (String(n2).toLowerCase()==="bye") ? " muted" : "";
        html += "<div class='bwfMatch"+conn+"'>";
        html += "<div class='bwfRow'><div class='bwfLeft'><div class='bwfSeed'>"+esc(mm.seed1||"")+"</div><div class='bwfName'>"+esc(n1)+"</div></div><div class='bwfRow' style='gap:10px'><div>"+dot1+"</div><div class='bwfScore'>"+esc(sc1)+"</div></div></div>";
        html += "<div class='bwfDivider'></div>";
        html += "<div class='bwfRow'><div class='bwfLeft'><div class='bwfSeed'>"+esc(mm.seed2||"")+"</div><div class='bwfName"+muted2+"'>"+esc(n2)+"</div></div><div class='bwfRow' style='gap:10px'><div>"+dot2+"</div><div class='bwfScore'>"+esc(sc2)+"</div></div></div>";
        if(schMap[id]) html += metaText(id);
        html += "</div>";
      }
      html += "</div>";
    }
    html += "</div></div>";
    return html;
  }

  function doPrintBracket(){ setActiveTab("draw"); window.print(); }

function entryLabel(e){
    if(!e) return "BYE";
    if(e.type==="D") return e.name1+" / "+e.name2;
    return e.name1;
  }

  function buildMatchesForCategory(cat){
    var st=loadState();
    var entries=(st.entries||[]).filter(function(e){ return e.category===cat; });
    if(entries.length<2) return {drawHtml:"Need at least 2 entries", matches:[]};

    // format
    var format=safeSel("drawFormat").value;
    var matches=[];
    var drawHtml="";
    if(format==="KO"){
      var ko=generateKO(entries);
      drawHtml += "<div>Knockout size: <b>"+ko.pow+"</b> (Byes: "+ko.byes+")</div>";
      drawHtml += "<ol>";
      for(var i=0;i<ko.slots.length;i++){
        drawHtml += "<li>"+esc(entryLabel(ko.slots[i]))+"</li>";
      }
      drawHtml += "</ol>";

      // create round-1 matches sequentially
      for(var i=0;i<ko.slots.length;i+=2){
        var a=ko.slots[i], b=ko.slots[i+1];
        if(a && b){
          matches.push({id:uid(), category:cat, round:1, a:a, b:b});
        } else if(a && !b){
          // bye -> auto advance; keep as match but marked bye
          matches.push({id:uid(), category:cat, round:1, a:a, b:null, bye:true});
        } else if(!a && b){
          matches.push({id:uid(), category:cat, round:1, a:b, b:null, bye:true});
        }
      }
    } else {
      var rr=generateRR(entries);
      drawHtml += "<div>Round Robin matches: <b>"+rr.length+"</b></div>";
      for(var i=0;i<rr.length;i++){
        var m=rr[i];
        matches.push({id:uid(), category:cat, round:m.round, a:m.a, b:m.b});
      }
    }

    return {drawHtml:drawHtml, matches:matches};
  }

  function renderMatches(matches){
    safeSel("statMatches").textContent = matches.length + " matches";
    var out=safeSel("matchesOutput");
    if(matches.length===0){ out.innerHTML=""; return; }
    var html="<table><thead><tr><th>ID</th><th>Cat</th><th>R</th><th>A</th><th>B</th></tr></thead><tbody>";
    for(var i=0;i<matches.length;i++){
      var m=matches[i];
      html+="<tr><td>"+m.id+"</td><td>"+esc(m.category)+"</td><td>"+(m.round||"")+"</td><td>"+esc(entryLabel(m.a))+"</td><td>"+esc(entryLabel(m.b))+"</td></tr>";
    }
    html+="</tbody></table>";
    out.innerHTML=html;
  }

  function doGenerateDraw(){
    var cat=safeSel("drawCategory").value;
    var res=buildMatchesForCategory(cat);
    safeSel("drawOutput").innerHTML = res.drawHtml;
    window.__latestMatches = res.matches || [];
    renderMatches(window.__latestMatches);
    var bOut=safeSel("bracketOutput");
    if(bOut){
      if(safeSel("drawFormat").value==="KO") bOut.innerHTML=renderBracketKO(window.__latestMatches);
      else bOut.innerHTML="<div class=\"hint\">Bracket view available for Knockout only.</div>";
    }
  }

  function saveMatchesToSchedule(){
    var st=loadState();
    st.matches = window.__latestMatches || st.matches || [];
    saveState(st);
    renderCtlMatchDropdown();
    alert("Saved "+(st.matches||[]).length+" matches to Schedule/Controller");
  }

  // SCHEDULE
  function parseTime(s){
    var m=(s||"").match(/^(\d{1,2}):(\d{2})$/);
    if(!m) return null;
    return {h:parseInt(m[1],10), m:parseInt(m[2],10)};
  }
  function addMinutes(dt, mins){
    return new Date(dt.getTime() + mins*60000);
  }
  function fmtTime(d){
    var hh=("0"+d.getHours()).slice(-2);
    var mm=("0"+d.getMinutes()).slice(-2);
    return hh+":"+mm;
  }
  function parseWindow(w){
    var parts=(w||"").split("-");
    if(parts.length!==2) return null;
    var a=parseTime(parts[0].trim()), b=parseTime(parts[1].trim());
    if(!a||!b) return null;
    return {start:a,end:b};
  }
  function windowMinutes(win){
    return (win.end.h*60+win.end.m)-(win.start.h*60+win.start.m);
  }

  
  function matchPlayers(m){
    function nm(e){ return entryLabel(e||{}); }
    return [nm(m.a), nm(m.b)].filter(function(x){return x && x!=="BYE";});
  }

  function generateSchedule(){
    var st=loadState();
    var matches=st.matches||[];
    if(matches.length===0) return alert("No matches. Go Draw → Generate → Save matches → Schedule.");

    var duration=parseInt(safeSel("schDuration").value||"45",10);
    var gap=parseInt(safeSel("schGap").value||"0",10);
    var courts=(safeSel("schCourts").value||"Court-1").split(",").map(function(x){return x.trim();}).filter(Boolean);

    var venue=norm(safeSel("schVenue") ? safeSel("schVenue").value : "");

    var s1=parseWindow(safeSel("schS1").value||"");
    var s2=parseWindow(safeSel("schS2").value||"");
    var wins=[];
    if(s1) wins.push(s1);
    if(s2) wins.push(s2);
    if(wins.length===0) return alert("Set session times, e.g. 10:00-13:00");

    var startDateStr=norm(safeSel("schDate").value);
    var baseDate = startDateStr ? new Date(startDateStr+"T00:00:00") : new Date();
    if(isNaN(baseDate.getTime())) baseDate=new Date();

    var slots=[];
    var days=30;
    for(var d=0; d<days; d++){
      var dayDate = new Date(baseDate.getTime() + d*24*3600*1000);
      for(var w=0; w<wins.length; w++){
        var win=wins[w];
        var startMin = win.start.h*60+win.start.m;
        var endMin = win.end.h*60+win.end.m;
        var t=startMin;
        while(t + duration <= endMin){
          for(var c=0; c<courts.length; c++){
            var slotStart=new Date(dayDate);
            slotStart.setHours(Math.floor(t/60), t%60, 0, 0);
            var slotEnd=addMinutes(slotStart, duration);
            slots.push({date:dayDate.toISOString().slice(0,10), court:courts[c], start:fmtTime(slotStart), end:fmtTime(slotEnd), ts:slotStart.getTime()});
          }
          t += duration + gap;
        }
      }
      if(slots.length >= matches.length*2) break;
    }
    slots.sort(function(a,b){ return a.ts-b.ts || a.court.localeCompare(b.court); });

    var restMinutes = duration + gap;
    var lastPlay = {};
    var used = new Array(slots.length);
    for(var u=0;u<used.length;u++) used[u]=false;

    var scheduled=[];
    function okAt(m, slot){
      var ps=matchPlayers(m);
      for(var i=0;i<ps.length;i++){
        var p=ps[i];
        if(lastPlay[p]!=null){
          var diff=(slot.ts-lastPlay[p])/60000.0;
          if(diff < restMinutes) return false;
        }
      }
      return true;
    }

    var order=matches.slice().sort(function(a,b){ return (a.bye?1:0)-(b.bye?1:0); });

    for(var i=0;i<order.length;i++){
      var m=order[i], idx=-1;
      for(var s=0;s<slots.length;s++){
        if(used[s]) continue;
        if(okAt(m, slots[s])){ idx=s; break; }
      }
      if(idx==-1){
        for(var s2=0;s2<slots.length;s2++){ if(!used[s2]){ idx=s2; break; } }
      }
      if(idx==-1) break;

      used[idx]=true;
      var slot=slots[idx];
      scheduled.push(Object.assign({}, m, {slot:{date:slot.date,court:slot.court,start:slot.start,end:slot.end,venue:venue}}));
      var ps=matchPlayers(m);
      for(var p=0;p<ps.length;p++){ lastPlay[ps[p]] = slot.ts; }
    }

    st.schedule=scheduled;
    saveState(st);
    renderSchedule();
    renderCtlMatchDropdown();
  }

  }

  function renderSchedule(){
    var st=loadState();
    var sch=st.schedule||[];
    safeSel("statSchedule").textContent = sch.length + " scheduled";
    var out=safeSel("scheduleOutput");
    if(sch.length===0){ out.innerHTML=""; return; }
    // group by date
    var by={};
    sch.forEach(function(m){
      var d=m.slot.date;
      if(!by[d]) by[d]=[];
      by[d].push(m);
    });
    var dates=Object.keys(by).sort();
    var html="";
    dates.forEach(function(d){
      html += "<h3>"+d+"</h3><div class='tableWrap'><table><thead><tr><th>Time</th><th>Venue</th><th>Court</th><th>Match</th><th>ID</th></tr></thead><tbody>";
      by[d].forEach(function(m){
        html += "<tr><td>"+m.slot.start+"-"+m.slot.end+"</td><td>"+esc(m.slot.venue||"")+"</td><td>"+esc(m.slot.court)+"</td><td>"+esc(entryLabel(m.a))+" vs "+esc(entryLabel(m.b))+"</td><td>"+m.id+"</td></tr>";
      });
      html += "</tbody></table></div>";
    });
    out.innerHTML=html;
  }

  function clearSchedule(){
    var st=loadState();
    st.schedule=[];
    saveState(st);
    renderSchedule();
    renderCtlMatchDropdown();
  }

  // CONTROLLER / SCORE
  function renderCtlMatchDropdown(){
    var st=loadState();
    var matches=(st.schedule && st.schedule.length)? st.schedule : (st.matches||[]);
    var sel=safeSel("ctlMatch");
    if(!sel) return;
    sel.innerHTML="";
    if(matches.length===0){
      var opt=document.createElement("option");
      opt.value=""; opt.textContent="(no matches yet)";
      sel.appendChild(opt);
      return;
    }
    matches.forEach(function(m){
      var opt=document.createElement("option");
      opt.value=m.id;
      opt.textContent=(m.category||"")+" • "+entryLabel(m.a)+" vs "+entryLabel(m.b);
      sel.appendChild(opt);
    });
    // keep current selection
    if(!sel.value && matches[0]) sel.value=matches[0].id;
    loadMatchToController();
  }

  function findMatch(id){
    var st=loadState();
    var all=(st.schedule && st.schedule.length)? st.schedule : (st.matches||[]);
    for(var i=0;i<all.length;i++) if(all[i].id===id) return all[i];
    return null;
  }

  function loadMatchToController(){
    var mid=safeSel("ctlMatch").value;
    var m=findMatch(mid);
    if(!m) return;
    var p1=entryLabel(m.a);
    var p2=entryLabel(m.b);
    safeSel("p1Name").textContent=p1;
    safeSel("p2Name").textContent=p2;

    var st=loadState();
    st.scores = st.scores || {};
    var sc = st.scores[mid] || {p1:p1,p2:p2,s1:0,s2:0};
    // keep names synced
    sc.p1=p1; sc.p2=p2;
    st.scores[mid]=sc;
    saveState(st);

    safeSel("p1Score").textContent=sc.s1||0;
    safeSel("p2Score").textContent=sc.s2||0;

    // link + display
    var link = location.origin + location.pathname.replace(/\/index\.html$/,"/") + "display.html?m=" + encodeURIComponent(mid);
    safeSel("ctlLink").textContent = link;
    safeSel("btnOpenDisplay").href = link;
  }

  function changeScore(side, delta){
    var mid=safeSel("ctlMatch").value;
    var st=loadState();
    st.scores = st.scores || {};
    var sc=st.scores[mid] || {s1:0,s2:0};
    if(side===1) sc.s1=Math.max(0,(parseInt(sc.s1||0,10)+delta));
    else sc.s2=Math.max(0,(parseInt(sc.s2||0,10)+delta));
    st.scores[mid]=sc;
    saveState(st);
    safeSel("p1Score").textContent=sc.s1||0;
    safeSel("p2Score").textContent=sc.s2||0;
  }

  function swapSides(){
    var mid=safeSel("ctlMatch").value;
    var st=loadState();
    var sc=st.scores && st.scores[mid];
    if(!sc) return;
    var t=sc.p1; sc.p1=sc.p2; sc.p2=t;
    var s=sc.s1; sc.s1=sc.s2; sc.s2=s;
    st.scores[mid]=sc; saveState(st);
    safeSel("p1Name").textContent=sc.p1; safeSel("p2Name").textContent=sc.p2;
    safeSel("p1Score").textContent=sc.s1; safeSel("p2Score").textContent=sc.s2;
  }

  function resetScore(){
    var mid=safeSel("ctlMatch").value;
    var st=loadState();
    if(!st.scores) st.scores={};
    var m=findMatch(mid);
    var p1=m?entryLabel(m.a):"Player 1";
    var p2=m?entryLabel(m.b):"Player 2";
    st.scores[mid]={p1:p1,p2:p2,s1:0,s2:0};
    saveState(st);
    loadMatchToController();
  }

  function showQR(targetId, text){
    var box=document.getElementById(targetId);
    box.innerHTML="";
    if(window.QRCode){
      new QRCode(box,{text:text,width:180,height:180});
    }else{
      box.textContent=text;
    }
  }

  // BACKUP
  function exportJSON(){
    var st=loadState();
    var blob=new Blob([JSON.stringify(st,null,2)],{type:"application/json"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url; a.download="dolphin_backup.json";
    a.click();
    setTimeout(function(){URL.revokeObjectURL(url);},500);
  }
  function importJSON(file){
    var r=new FileReader();
    r.onload=function(){
      try{
        var st=JSON.parse(r.result);
        saveState(st);
        renderEntries(); renderSchedule(); renderCtlMatchDropdown();
        alert("Imported backup");
      }catch(e){ alert("Invalid JSON"); }
    };
    r.readAsText(file);
  }

  function init(){
    // tabs
    var btns=document.querySelectorAll(".tabs button");
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener("click", function(){
        setActiveTab(this.getAttribute("data-tab"));
      });
    }

    // entries
    safeSel("btnImportLocal").addEventListener("click", importFromPaste);
    safeSel("btnClearEntries").addEventListener("click", function(){
      var st=loadState(); st.entries=[]; saveState(st); renderEntries();
    });
    safeSel("btnManualAdd").addEventListener("click", manualAdd);

    safeSel("tblEntries").addEventListener("click", function(e){
      var t=e.target;
      if(t && t.getAttribute && t.getAttribute("data-del")!=null){
        deleteEntry(parseInt(t.getAttribute("data-del"),10));
      }
    });

    // draw
    safeSel("btnGenerateDraw").addEventListener("click", function(e){ if(!requireRole("admin")) return; doGenerateDraw(e); });
    if(safeSel("btnPrintBracket")) safeSel("btnPrintBracket").addEventListener("click", doPrintBracket);
    safeSel("btnSaveMatches").addEventListener("click", function(e){ if(!requireRole("admin")) return; saveMatchesToSchedule(e); });

    // schedule
    safeSel("btnGenerateSchedule").addEventListener("click", function(e){ if(!requireRole("admin")) return; generateSchedule(e); });
    safeSel("btnClearSchedule").addEventListener("click", function(e){ if(!requireRole("admin")) return; clearSchedule(e); });
    // Click schedule row to edit venue/court/time (settable courts)
    safeSel("scheduleOutput").addEventListener("click", function(ev){
      var t=ev.target;
      while(t && t.tagName && t.tagName!=="TR") t=t.parentNode;
      if(!t) return;
      var cells=t.querySelectorAll("td");
      if(!cells || cells.length<5) return;
      var mid=cells[cells.length-1].textContent.trim();
      if(!mid) return;

      var st=loadState();
      st.schedule = st.schedule || [];
      for(var i=0;i<st.schedule.length;i++){
        if(st.schedule[i].id===mid){
          var cur=st.schedule[i].slot||{};
          var newVenue = prompt("Venue/Location", cur.venue||"");
          if(newVenue===null) return;
          var newCourt = prompt("Court (use one of your Courts names)", cur.court||"");
          if(newCourt===null) return;
          var newTime = prompt("Time (HH:MM-HH:MM)", (cur.start||"")+"-"+(cur.end||""));
          if(newTime===null) return;
          var parts=newTime.split("-");
          if(parts.length===2){
            cur.start=parts[0].trim();
            cur.end=parts[1].trim();
          }
          cur.venue=newVenue.trim();
          cur.court=newCourt.trim();
          st.schedule[i].slot=cur;
          saveState(st);
          renderSchedule();
          var bOut=safeSel("bracketOutput");
          if(bOut && safeSel("drawFormat").value==="KO" && window.__latestMatches){
            bOut.innerHTML=renderBracketKO(window.__latestMatches);
          }
          return;
        }
      }
    });


    // controller
    safeSel("ctlMatch").addEventListener("change", loadMatchToController);
    var scoreBtns=document.querySelectorAll("#controller button[data-side]");
    for(var i=0;i<scoreBtns.length;i++){
      scoreBtns[i].addEventListener("click", function(){
        var side=parseInt(this.getAttribute("data-side"),10);
        var delta=parseInt(this.getAttribute("data-delta"),10);
        changeScore(side, delta);
      });
    }
    safeSel("btnSwap").addEventListener("click", swapSides);
    safeSel("btnResetScore").addEventListener("click", resetScore);
    safeSel("btnCtlQR").addEventListener("click", function(){
      var mid=safeSel("ctlMatch").value;
      var link = location.origin + location.pathname.replace(/\/index\.html$/,"/") + "display.html?m=" + encodeURIComponent(mid);
      showQR("qrBox", link);
    });

    // display tab qr
    safeSel("btnDispQR").addEventListener("click", function(){
      var link=safeSel("btnOpenDisplay").href || "";
      showQR("dispQR", link);
    });

    // settings
    safeSel("btnExportJSON").addEventListener("click", function(e){ if(!requireRole("admin")) return; exportJSON(e); });
    safeSel("btnImportJSON").addEventListener("click", function(){
      var f=safeSel("fileImportJSON").files[0];
      if(!f) return alert("Choose a backup file first");
      importJSON(f);
    });

    // render initial
    renderEntries();
    renderSchedule();
    renderCtlMatchDropdown();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
