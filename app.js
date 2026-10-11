/* KIIT Block A & B indoor navigation
   Pure JavaScript — no framework or external dependency.
   The floor-plan coordinates are approximate map coordinates read from the supplied
   photographed blueprints. The calibrated walking scale uses B116 → B117 = 11 steps.
*/

const floors = [
  {id:0, label:"Ground Floor"},
  {id:1, label:"1st Floor"},
  {id:2, label:"2nd Floor"},
  {id:3, label:"3rd Floor"}
];

// Build the map only after the floor configuration exists.
// This prevents a temporal-dead-zone error when buildCampusMap() reads floors[f].
const BUILTIN = buildCampusMap();
let campus = deepClone(BUILTIN);
let currentMode = "shortest";
let zoom = 1;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
function esc(s){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
// Room IDs match the blueprints: A001 (ground), A101 (1st), A201 (2nd), A301 (3rd).
function floorRoom(prefix, n, floor){
  const floorDigit = floor === 0 ? "0" : String(floor);
  return prefix + floorDigit + String(n).padStart(2, "0");
}
function floorCode(f){ return f===0 ? "G" : String(f); }

function buildCampusMap(){
  const nodes=[], edges=[];
  const addNode=(id,label,type,block,floor,x,y,extra={})=>nodes.push({id,label,type,block,floor,x,y,accessible:type!=="stair",...extra});
  const addEdge=(a,b,weight,type="corridor",bidirectional=true,accessible=true)=>edges.push({start:a,end:b,distance:Math.max(1,Math.round(weight)),routeType:type,bidirectional,accessible});
  const P = {
    A01:[214,412], A02:[205,347], A03:[300,319], A04:[205,283], A05:[205,221],
    A06:[292,163], A07:[366,163], A08:[350,218], A09:[442,163], A10:[420,218],
    A11:[505,285], A12:[420,319], A13:[505,351], A14:[526,482], A15:[526,530],
    A16:[410,508], A17:[360,420], A18:[355,508],
    B01:[1005,681], B02:[1000,616], B03:[902,560], B04:[1000,548], B05:[1000,470],
    B06:[918,415], B07:[850,415], B08:[850,474], B09:[790,415], B10:[790,474],
    B11:[705,315], B12:[650,314], B13:[635,390], B14:[575,314], B15:[590,390],
    B16:[706,480], B17:[706,523], B18:[785,557], B19:[808,683], B20:[842,756],
    B21:[875,683], B22:[902,756]
  };
  const J = {
    A_TOP:[350,145], A_TOPMID:[350,235], A_LEFT_TOP:[240,235], A_LEFT_MID:[240,350],
    A_LEFT_BOTTOM:[240,420], A_CENTER:[360,350], A_RIGHT_TOP:[505,245], A_RIGHT_MID:[505,365],
    A_BOTTOM_LEFT:[315,470], A_BOTTOM:[500,455], AB_TOP:[570,365], AB_MID:[575,425],
    B_TOP:[800,365], B_MID:[800,500], B_LEFT_MID:[705,450], B_CENTER:[900,500],
    B_CENTER_LOW:[800,610], B_RIGHT_TOP:[970,445], B_RIGHT_MID:[970,560],
    B_RIGHT_LOW:[970,650], B_BOTTOM:[875,720]
  };
  const stairs = {
    A_NW:[265,215], A_SW:[285,490], AB_W:[505,400], AB_E:[710,405], B_NE:[965,395], B_SE:[940,675]
  };
  const toilets = [
    ["A_LADIES_N","Ladies Toilet — A North","A",205,105,"A_TOP"],
    ["A_GENTS_N","Gents Toilet — A North","A",470,105,"A_TOP"],
    ["A_GENTS_S","Gents Toilet — A South","A",230,520,"A_BOTTOM_LEFT"],
    ["B_LADIES_N","Ladies Toilet — B North","B",1015,260,"B_TOP"],
    ["B_GENTS_N","Gents Toilet — B North","B",1015,350,"B_TOP"],
    ["B_LADIES_S","Ladies Toilet — B South","B",1040,690,"B_RIGHT_LOW"]
  ];

  const roomLinks = [
    ["A06","A_TOP"],["A07","A_TOP"],["A09","A_TOP"],["A05","A_LEFT_TOP"],["A08","A_TOPMID"],["A10","A_TOPMID"],
    ["A04","A_LEFT_MID"],["A03","A_CENTER"],["A12","A_CENTER"],["A02","A_LEFT_MID"],["A11","A_RIGHT_TOP"],["A13","A_RIGHT_MID"],
    ["A01","A_LEFT_BOTTOM"],["A17","A_BOTTOM"],["A14","A_BOTTOM"],["A15","A_BOTTOM"],["A18","A_BOTTOM_LEFT"],["A16","A_BOTTOM_LEFT"],
    ["B14","AB_TOP"],["B12","AB_TOP"],["B11","B_TOP"],["B15","AB_MID"],["B13","AB_MID"],
    ["B09","B_TOP"],["B07","B_TOP"],["B06","B_TOP"],["B10","B_MID"],["B08","B_MID"],
    ["B05","B_RIGHT_TOP"],["B04","B_RIGHT_MID"],["B03","B_CENTER"],["B02","B_RIGHT_LOW"],["B01","B_BOTTOM"],
    ["B18","B_CENTER_LOW"],["B19","B_BOTTOM"],["B21","B_BOTTOM"],["B20","B_BOTTOM"],["B22","B_BOTTOM"],
    ["B16","B_LEFT_MID"],["B17","B_LEFT_MID"]
  ];

  const corridorLinks = [
    ["A_TOP","A_TOPMID"],["A_TOPMID","A_CENTER"],["A_CENTER","A_BOTTOM"],
    ["A_LEFT_TOP","A_TOPMID"],["A_LEFT_TOP","A_LEFT_MID"],["A_LEFT_MID","A_LEFT_BOTTOM"],
    ["A_LEFT_MID","A_CENTER"],["A_CENTER","A_RIGHT_TOP"],["A_RIGHT_TOP","A_RIGHT_MID"],
    ["A_RIGHT_MID","AB_TOP"],["A_BOTTOM_LEFT","A_BOTTOM"],["A_BOTTOM","A_RIGHT_MID"],
    ["AB_TOP","AB_MID"],["AB_MID","B_LEFT_MID"],["B_LEFT_MID","B_MID"],
    ["B_LEFT_MID","B_TOP"],["B_TOP","B_MID"],["B_TOP","B_RIGHT_TOP"],
    ["B_RIGHT_TOP","B_RIGHT_MID"],["B_RIGHT_MID","B_RIGHT_LOW"],["B_RIGHT_LOW","B_BOTTOM"],
    ["B_MID","B_CENTER"],["B_CENTER","B_RIGHT_MID"],["B_MID","B_CENTER_LOW"],
    ["B_CENTER_LOW","B_BOTTOM"],["B_BOTTOM","B_RIGHT_LOW"]
  ];

  for(let f=0;f<=3;f++){
    const suffix = floorCode(f);
    for(const [key,[x,y]] of Object.entries(J)){
      addNode(`J_${suffix}_${key}`, `Corridor Junction · ${key.replaceAll("_"," ")}`,"junction","A/B",f,x,y);
    }
    for(const [key,[x,y]] of Object.entries(stairs)){
      addNode(`STAIR_${suffix}_${key}`, `Staircase ${key.replaceAll("_"," ")} · ${floors[f].label}`,"stair","A/B",f,x,y,{accessible:false});
    }
    for(const [id,[x,y]] of Object.entries(P)){
      const block=id[0], n=Number(id.slice(1));
      const rid=floorRoom(block,n,f);
      addNode(rid,rid,"room",block,f,x,y,{accessible:true});
    }
    for(const [id,label,block,x,y,jkey] of toilets){
      const tid=`TOILET_${f}_${id}`;
      addNode(tid,label, "toilet",block,f,x,y);
      addEdge(tid,`J_${suffix}_${jkey}`,Math.hypot(x-J[jkey][0],y-J[jkey][1])*0.275,"corridor",true,true);
    }
    for(const [rid,jkey] of roomLinks){
      const block=rid[0], n=Number(rid.slice(1));
      const full=floorRoom(block,n,f);
      const [x,y]=P[rid], [jx,jy]=J[jkey];
      addEdge(full,`J_${suffix}_${jkey}`,Math.hypot(x-jx,y-jy)*0.275,"corridor",true,true);
    }
    for(const [a,b] of corridorLinks){
      const [ax,ay]=J[a], [bx,by]=J[b];
      addEdge(`J_${suffix}_${a}`,`J_${suffix}_${b}`,Math.hypot(ax-bx,ay-by)*0.275,"corridor",true,true);
    }
    // Same-floor staircase links to nearby corridor junctions.
    const stairLinks=[
      ["A_NW","A_TOPMID"],["A_SW","A_BOTTOM_LEFT"],["AB_W","AB_MID"],
      ["AB_E","B_LEFT_MID"],["B_NE","B_TOP"],["B_SE","B_BOTTOM"]
    ];
    for(const [s,j] of stairLinks){
      const [sx,sy]=stairs[s], [jx,jy]=J[j];
      addEdge(`STAIR_${suffix}_${s}`,`J_${suffix}_${j}`,Math.hypot(sx-jx,sy-jy)*0.275,"corridor",true,true);
    }
    // Block C connections shown on the photographed boards.
    addNode(`C_A_${suffix}`,"Entry from C Block — A","entrance","C",f,520,560);
    addNode(`C_B_${suffix}`,"Entry from C Block — B","entrance","C",f,720,560);
    addEdge(`C_A_${suffix}`,`J_${suffix}_A_BOTTOM`,Math.hypot(520-J.A_BOTTOM[0],560-J.A_BOTTOM[1])*0.275,"entrance",true,true);
    addEdge(`C_B_${suffix}`,`J_${suffix}_B_CENTER_LOW`,Math.hypot(720-J.B_CENTER_LOW[0],560-J.B_CENTER_LOW[1])*0.275,"entrance",true,true);

    // Vertical stair connections are added below.
  }

  for(let f=0;f<3;f++){
    for(const s of Object.keys(stairs)){
      addEdge(`STAIR_${floorCode(f)}_${s}`,`STAIR_${floorCode(f+1)}_${s}`,35,"stairs",true,false);
    }
  }

  // External entry gates exist on the ground-floor blueprint.
  addNode("ENTRY_A","Entry Gate — Block A","entrance","A",0,80,350);
  addNode("ENTRY_B","Entry Gate — Block B","entrance","B",0,1000,790);
  addEdge("ENTRY_A","J_G_A_LEFT_BOTTOM",Math.hypot(80-J.A_LEFT_BOTTOM[0],350-J.A_LEFT_BOTTOM[1])*0.275,"entrance",true,true);
  addEdge("ENTRY_B","J_G_B_BOTTOM",Math.hypot(1000-J.B_BOTTOM[0],790-J.B_BOTTOM[1])*0.275,"entrance",true,true);

  // Reference calibration: B116 → B117 is 11 walking steps.
  // The map coordinates use the relative photographed blueprint geometry.
  addEdge("B116","B117",11,"corridor",true,true);
  addEdge("B216","B217",11,"corridor",true,true);
  addEdge("B316","B317",11,"corridor",true,true);
  addEdge("B016","B017",11,"corridor",true,true);

  return {version:"1.0", calibration:{reference:"B116 → B117",steps:11,unit:"walking steps",pixelScale:0.275}, nodes, edges};
}

function nodeById(id){return campus.nodes.find(n=>n.id===id);}
function edgeKey(a,b){return `${a}→${b}`;}
function adjacency(data=campus){
  const adj=new Map();
  for(const n of data.nodes) adj.set(n.id,[]);
  for(const e of data.edges){
    if(!adj.has(e.start)||!adj.has(e.end)) continue;
    adj.get(e.start).push({to:e.end,edge:e});
    if(e.bidirectional) adj.get(e.end).push({to:e.start,edge:{...e,start:e.end,end:e.start}});
  }
  return adj;
}

function dijkstra(source,target,opts={}){
  const adj=adjacency();
  const blockedNodes=new Set(opts.blockedNodes||[]);
  const blockedEdges=new Set(opts.blockedEdges||[]);
  if(blockedNodes.has(source)||blockedNodes.has(target)) return null;
  const dist=new Map(), prev=new Map(), visited=new Set();
  campus.nodes.forEach(n=>dist.set(n.id,Infinity));
  dist.set(source,0);
  const heap=[[0,source]];
  while(heap.length){
    heap.sort((a,b)=>a[0]-b[0]);
    const [d,u]=heap.shift();
    if(visited.has(u)) continue;
    visited.add(u);
    if(u===target) break;
    for(const item of (adj.get(u)||[])){
      const v=item.to,e=item.edge;
      const key=`${u}|${v}`;
      if(blockedNodes.has(v)||blockedEdges.has(key)) continue;
      if(opts.accessible && !e.accessible) continue;
      const nd=d+Number(e.distance);
      if(nd<dist.get(v)){
        dist.set(v,nd); prev.set(v,{node:u,edge:e}); heap.push([nd,v]);
      }
    }
  }
  if(!Number.isFinite(dist.get(target))) return null;
  const path=[], edgePath=[];
  let cur=target;
  while(cur!==source){
    path.push(cur);
    const p=prev.get(cur);
    if(!p) return null;
    edgePath.push(p.edge);
    cur=p.node;
  }
  path.push(source);
  path.reverse(); edgePath.reverse();
  return {nodes:path,edges:edgePath,distance:Math.round(dist.get(target))};
}

// Yen's loopless K-shortest paths.
function kShortestPaths(source,target,k=3,opts={}){
  const first=dijkstra(source,target,opts);
  if(!first) return [];
  const A=[first], seen=new Set([first.nodes.join(">")]), B=[];
  for(let ki=1;ki<k;ki++){
    const prevPath=A[ki-1];
    for(let i=0;i<prevPath.nodes.length-1;i++){
      const spurNode=prevPath.nodes[i];
      const rootNodes=prevPath.nodes.slice(0,i+1);
      const rootEdges=prevPath.edges.slice(0,i);
      let rootDistance=0;
      for(const e of rootEdges) rootDistance+=Number(e.distance);

      const blockedEdges=[];
      for(const p of A){
        if(p.nodes.length>i && p.nodes.slice(0,i+1).join(">")===rootNodes.join(">")){
          const a=p.nodes[i], b=p.nodes[i+1];
          blockedEdges.push(`${a}|${b}`);
        }
      }
      const blockedNodes=rootNodes.slice(0,-1);
      const spur=dijkstra(spurNode,target,{...opts,blockedEdges,blockedNodes});
      if(!spur) continue;
      const totalNodes=rootNodes.slice(0,-1).concat(spur.nodes);
      const totalEdges=rootEdges.concat(spur.edges);
      const total={nodes:totalNodes,edges:totalEdges,distance:rootDistance+spur.distance};
      const key=total.nodes.join(">");
      if(!seen.has(key)){seen.add(key);B.push(total);}
    }
    if(!B.length) break;
    B.sort((a,b)=>a.distance-b.distance);
    A.push(B.shift());
  }
  return A;
}

function nodeLabel(id){const n=nodeById(id);return n?n.label:id;}
function floorLabel(f){return floors.find(x=>x.id===f)?.label||`Floor ${f}`;}

function routeDirections(route){
  if(!route) return [];
  const out=[];
  for(let i=0;i<route.edges.length;i++){
    const e=route.edges[i], a=nodeById(e.start), b=nodeById(e.end);
    if(e.routeType==="stairs"){
      out.push(`Take the stairs from ${floorLabel(a.floor)} to ${floorLabel(b.floor)}.`);
      continue;
    }
    if(a.type==="entrance"){
      out.push(`Enter through ${a.label}, then follow the corridor toward ${nodeLabel(b.id)}.`);
      continue;
    }
    if(b.type==="room"||b.type==="toilet"){
      out.push(`Continue along the corridor to ${b.label}.`);
      continue;
    }
    const dx=b.x-a.x, dy=b.y-a.y;
    const dir=Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up");
    out.push(`Walk ${dir} along the corridor.`);
  }
  // Compress repeated identical directions.
  return out.filter((v,i,a)=>i===0||v!==a[i-1]);
}

function summarizeRoute(route){
  const floorsUsed=[...new Set(route.nodes.map(id=>nodeById(id).floor))].sort((a,b)=>a-b);
  const stairs=route.edges.filter(e=>e.routeType==="stairs").length;
  return {floorsUsed,stairs};
}

function populateSearches(){
  const all=[...campus.nodes].sort((a,b)=>{
    const af=`${a.block}-${a.floor}-${a.label}`, bf=`${b.block}-${b.floor}-${b.label}`;
    return af.localeCompare(bf);
  });
  renderSelect($("#sourceSelect"),all,$("#sourceSearch").value);
  renderSelect($("#destSelect"),all,$("#destSearch").value);
}
function renderSelect(select,nodes,filter){
  const f=String(filter||"").toLowerCase();
  const current=select.value;
  select.innerHTML="";
  nodes.filter(n=>`${n.label} ${n.id} ${n.type} ${floorLabel(n.floor)}`.toLowerCase().includes(f)).forEach(n=>{
    const o=document.createElement("option");
    o.value=n.id;o.textContent=`${n.label} · ${floorLabel(n.floor)}`;
    select.appendChild(o);
  });
  if([...select.options].some(o=>o.value===current)) select.value=current;
}

const NS="http://www.w3.org/2000/svg";
function svgEl(tag,attrs={}){
  const el=document.createElementNS(NS,tag);
  for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  return el;
}

function floorEdges(floorId){
  const ids=new Set(campus.nodes.filter(n=>n.floor===floorId).map(n=>n.id));
  const seen=new Set();
  const out=[];
  for(const e of campus.edges){
    if(e.routeType==="stairs") continue;
    if(!ids.has(e.start)||!ids.has(e.end)) continue;
    const key=[e.start,e.end].sort().join("|");
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function drawMaps(route=null){
  $("#mapStack").style.transform=`scale(${zoom})`;
  const pathNodeSet=route?new Set(route.nodes):new Set();
  const pathEdgeSet=new Set();
  if(route){
    for(let i=0;i<route.nodes.length-1;i++){
      const a=route.nodes[i], b=route.nodes[i+1];
      pathEdgeSet.add(`${a}|${b}`);
      pathEdgeSet.add(`${b}|${a}`);
    }
  }
  for(const f of floors){
    const card=document.querySelector(`.floor-card[data-floor="${f.id}"]`);
    if(!card) continue;
    const svg=card.querySelector("svg");
    svg.innerHTML="";

    // Blueprint grid background
    const defs=svgEl("defs");
    const pattern=svgEl("pattern",{id:`grid-${f.id}`,width:"40",height:"40",patternUnits:"userSpaceOnUse"});
    pattern.appendChild(svgEl("path",{d:"M 40 0 L 0 0 0 40",fill:"none",stroke:"#1a334d","stroke-width":"0.6"}));
    defs.appendChild(pattern);
    svg.appendChild(defs);
    svg.appendChild(svgEl("rect",{x:"0",y:"0",width:"1200",height:"850",fill:`url(#grid-${f.id})`,class:"graph-grid"}));
    svg.appendChild(svgEl("rect",{x:"0",y:"0",width:"1200",height:"850",fill:"none",stroke:"#23405c","stroke-width":"2",class:"graph-frame"}));

    // Block region labels
    const blockA=svgEl("text",{x:"280",y:"80",class:"block-title"}); blockA.textContent="BLOCK A"; svg.appendChild(blockA);
    const blockB=svgEl("text",{x:"820",y:"80",class:"block-title"}); blockB.textContent="BLOCK B"; svg.appendChild(blockB);
    const blockC=svgEl("text",{x:"560",y:"800",class:"block-title-c"}); blockC.textContent="C"; svg.appendChild(blockC);

    const floorNodes=campus.nodes.filter(n=>n.floor===f.id);
    const edges=floorEdges(f.id);

    // Corridor edges (base graph)
    const edgeLayer=svgEl("g",{class:"edge-layer"});
    for(const e of edges){
      const a=nodeById(e.start), b=nodeById(e.end);
      if(!a||!b) continue;
      const onRoute=pathEdgeSet.has(`${e.start}|${e.end}`);
      const cls=onRoute?"corridor-edge route-active":"corridor-edge";
      edgeLayer.appendChild(svgEl("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:cls}));
    }
    svg.appendChild(edgeLayer);

    // Active route glow on top
    if(route){
      const routeLayer=svgEl("g",{class:"route-layer"});
      for(let i=0;i<route.nodes.length-1;i++){
        const a=nodeById(route.nodes[i]), b=nodeById(route.nodes[i+1]);
        if(!a||!b||a.floor!==f.id||b.floor!==f.id) continue;
        for(const cls of ["route-glow","route-line","route-dash"]){
          routeLayer.appendChild(svgEl("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:cls}));
        }
      }
      svg.appendChild(routeLayer);
    }

    // Nodes
    const nodeLayer=svgEl("g",{class:"node-layer"});
    const showAdmin=!$("#adminPanel").classList.contains("hidden");
    for(const n of floorNodes){
      const onPath=pathNodeSet.has(n.id);
      let r=5, cls="node junction";
      if(n.type==="room"){ r=onPath?12:9; cls="node room"+(onPath?" on-route":""); }
      else if(n.type==="toilet"){ r=onPath?11:8; cls="node toilet"+(onPath?" on-route":""); }
      else if(n.type==="entrance"){ r=onPath?11:8; cls="node entrance"+(onPath?" on-route":""); }
      else if(n.type==="stair"){ r=onPath?10:7; cls="node stair"+(onPath?" on-route":""); }
      else { cls="node junction"+(onPath?" on-route":""); r=onPath?7:4; }

      const c=svgEl("circle",{cx:n.x,cy:n.y,r,class:cls,"data-node":n.id});
      nodeLayer.appendChild(c);

      // Labels for rooms / toilets / entrances always; junctions only in admin or on route
      const showLabel=n.type==="room"||n.type==="toilet"||n.type==="entrance"||(n.type==="stair"&&onPath)||(showAdmin)||(onPath&&n.type==="junction");
      if(showLabel){
        const label=n.type==="room"?n.id:(n.type==="toilet"?n.label.replace(/ — .*/,""):n.type==="entrance"?n.label.split("—")[0].trim():n.id);
        const t=svgEl("text",{x:n.x+(n.type==="room"?0:10),y:n.y+(n.type==="room"?4:-10),class:n.type==="room"?"room-label":"node-label"});
        t.textContent=label;
        if(n.type==="room") t.setAttribute("text-anchor","middle");
        nodeLayer.appendChild(t);
      }
    }
    svg.appendChild(nodeLayer);

    // Click handlers for selecting source/dest
    nodeLayer.querySelectorAll("circle[data-node]").forEach(c=>{
      c.style.cursor="pointer";
      c.addEventListener("click",()=>{
        const id=c.getAttribute("data-node");
        const src=$("#sourceSelect").value;
        if(!src){ selectNodeById("#sourceSelect",id); }
        else if(!$("#destSelect").value){ selectNodeById("#destSelect",id); findAndRender(); }
        else { selectNodeById("#sourceSelect",id); $("#destSearch").value=""; populateSearches(); }
      });
    });

    const floorSegments=route?route.nodes.reduce((acc,id,i,arr)=>{
      if(i===0) return acc;
      const a=nodeById(arr[i-1]), b=nodeById(id);
      if(a&&b&&a.floor===f.id&&b.floor===f.id) acc.push(1);
      return acc;
    },[]):[];
    const badge=card.querySelector(".floor-route-badge");
    badge.classList.toggle("hidden",floorSegments.length===0);
  }
}

function renderFloorCards(){
  const stack=$("#mapStack"); stack.innerHTML="";
  const tpl=$("#floorTemplate");
  for(const f of floors){
    const card=tpl.content.firstElementChild.cloneNode(true);
    card.dataset.floor=f.id;
    card.querySelector(".floor-label").textContent=f.id===0?"Ground":`${f.id}${f.id===1?"st":f.id===2?"nd":"rd"}`;
    card.querySelector(".floor-name").textContent=f.label;
    stack.appendChild(card);
  }
  drawMaps();
}

function setSearchValue(id){
  const n=nodeById(id); if(!n) return;
  const isSource=id===pendingSource;
  const input=isSource?$("#sourceSearch"):$("#destSearch");
  const select=isSource?$("#sourceSelect"):$("#destSelect");
  input.value=n.label;
  populateSearches();
  select.value=id;
}
let pendingSource=null;

function selectNodeById(selectId,nodeId){
  const select=$(selectId), input=selectId==="#sourceSelect"?$("#sourceSearch"):$("#destSearch");
  input.value=nodeLabel(nodeId);
  populateSearches();
  select.value=nodeId;
}

function findAndRender(){
  const source=$("#sourceSelect").value, target=$("#destSelect").value;
  if(!source||!target){
    $("#routeSummary").innerHTML=`<div class="empty-state"><div class="empty-icon">!</div><p>Select both a source and destination.</p></div>`;
    return;
  }
  if(source===target){
    $("#routeSummary").innerHTML=`<div class="empty-state"><p>Source and destination are the same node.</p></div>`;
    return;
  }
  const opts={accessible:currentMode==="accessible"};
  const routes=currentMode==="alternatives"?kShortestPaths(source,target,4,opts):kShortestPaths(source,target,1,opts);
  if(!routes.length){
    $("#routeSummary").innerHTML=`<div class="empty-state"><div class="empty-icon">×</div><p>No ${currentMode==="accessible"?"accessible ":""}route exists in the current map data.</p><p>Use Admin → Map JSON to add an accessible lift/connection if the building has one.</p></div>`;
    drawMaps(); return;
  }
  renderRouteSummary(routes,source,target);
  drawMaps(routes[0]);
}

function renderRouteSummary(routes,source,target){
  const best=routes[0], meta=summarizeRoute(best);
  const pathText=best.nodes.map(nodeLabel).join(" → ");
  const floorsText=meta.floorsUsed.map(floorLabel).join(" → ");
  const dirs=routeDirections(best);
  let html=`<div class="result-main">
    <div class="stat"><span>Walking distance</span><strong>${best.distance} steps</strong></div>
    <div class="stat"><span>Floor transitions</span><strong>${meta.stairs}</strong></div>
  </div>
  <div class="stat" style="margin-bottom:9px"><span>Floors used</span><strong>${esc(floorsText)}</strong></div>
  <div class="route-option active"><strong>Shortest route</strong><div class="path-text">${esc(pathText)}</div></div>`;
  if(routes.length>1){
    html+=`<div class="sample-title" style="margin-top:12px">Alternative routes</div><div class="route-list">`;
    routes.slice(1).forEach((r,i)=>{
      html+=`<button class="route-option" data-route-index="${i+1}"><strong>Alternative ${i+1} · ${r.distance} steps</strong><div class="path-text">${esc(r.nodes.map(nodeLabel).join(" → "))}</div></button>`;
    });
    html+=`</div>`;
  }
  html+=`<div class="direction-box"><h4>Text directions</h4><ol>${dirs.map(d=>`<li>${esc(d)}</li>`).join("")}</ol></div>`;
  $("#routeSummary").innerHTML=html;
  $$("#routeSummary [data-route-index]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const r=routes[Number(btn.dataset.routeIndex)];
      drawMaps(r);
      $$("#routeSummary .route-option").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      // Update summary stats while keeping the list.
      const m=summarizeRoute(r);
      const stats=$$("#routeSummary .stat strong");
      if(stats[0]) stats[0].textContent=`${r.distance} steps`;
      if(stats[1]) stats[1].textContent=m.stairs;
      const dirBox=$("#routeSummary .direction-box ol");
      if(dirBox) dirBox.innerHTML=routeDirections(r).map(d=>`<li>${esc(d)}</li>`).join("");
    });
  });
}

function setupSearch(inputId,selectId){
  $(inputId).addEventListener("input",()=>renderSelect($(selectId),campus.nodes,$(inputId).value));
  $(inputId).addEventListener("focus",()=>renderSelect($(selectId),campus.nodes,$(inputId).value));
  $(selectId).addEventListener("change",()=>$(inputId).value=nodeLabel($(selectId).value));
}

function refreshAdminJson(){ $("#jsonEditor").value=JSON.stringify(campus,null,2); }
function openAdmin(){
  $("#adminPanel").classList.remove("hidden"); refreshAdminJson(); drawMaps();
}
function closeAdmin(){ $("#adminPanel").classList.add("hidden"); drawMaps(); }

function applyEditedJson(){
  try{
    const parsed=JSON.parse($("#jsonEditor").value);
    if(!parsed.nodes||!parsed.edges) throw new Error("JSON must contain nodes and edges arrays.");
    campus=parsed;
    populateSearches();
    renderFloorCards();
    $("#adminMessage").textContent="Map data applied successfully.";
  }catch(e){$("#adminMessage").textContent=`Invalid JSON: ${e.message}`;}
}

function resetData(){
  campus=deepClone(BUILTIN);
  populateSearches(); renderFloorCards(); refreshAdminJson();
  $("#adminMessage").textContent="Built-in map restored.";
}

function wire(){
  renderFloorCards();
  populateSearches();
  setupSearch("#sourceSearch","#sourceSelect");
  setupSearch("#destSearch","#destSelect");

  $$(".mode-btn").forEach(btn=>btn.addEventListener("click",()=>{
    $$(".mode-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); currentMode=btn.dataset.mode;
  }));
  $("#findRoute").addEventListener("click",findAndRender);
  $("#sourceSelect").addEventListener("dblclick",findAndRender);
  $("#destSelect").addEventListener("dblclick",findAndRender);
  $$(".sample-btn").forEach(btn=>btn.addEventListener("click",()=>{
    selectNodeById("#sourceSelect",btn.dataset.source);
    selectNodeById("#destSelect",btn.dataset.dest);
    currentMode="shortest";
    $$(".mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode==="shortest"));
    findAndRender();
  }));
  $("#resetBtn").addEventListener("click",()=>{
    $("#sourceSearch").value="";$("#destSearch").value="";
    populateSearches();drawMaps();
    $("#routeSummary").innerHTML=`<div class="empty-state"><div class="empty-icon">⌖</div><p>Choose a source and destination to calculate a route.</p></div>`;
  });
  $("#adminBtn").addEventListener("click",openAdmin);
  $("#closeAdmin").addEventListener("click",closeAdmin);
  $("#applyJson").addEventListener("click",applyEditedJson);
  $("#resetData").addEventListener("click",resetData);
  $("#exportJson").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify(campus,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kiit-campus-map.json";a.click();URL.revokeObjectURL(a.href);
  });
  $("#importJson").addEventListener("change",e=>{
    const file=e.target.files[0]; if(!file)return;
    const r=new FileReader();
    r.onload=()=>{$("#jsonEditor").value=r.result;applyEditedJson();};
    r.readAsText(file);
  });
  $("#zoomIn").addEventListener("click",()=>{zoom=Math.min(1.5,zoom+.1);$("#zoomValue").textContent=Math.round(zoom*100)+"%";drawMaps();});
  $("#zoomOut").addEventListener("click",()=>{zoom=Math.max(.7,zoom-.1);$("#zoomValue").textContent=Math.round(zoom*100)+"%";drawMaps();});
}

document.addEventListener("DOMContentLoaded",wire);
