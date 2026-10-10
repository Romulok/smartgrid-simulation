(function(){
  "use strict";

  const SETUP_COLORS = ["#0072B2","#D55E00","#009E73","#CC79A7","#E69F00","#56B4E9","#7B4B94","#4E5D6C"];
  const SEC02_COST = {lorawan:30, rs485:19.5, nbiot:3.2, ltem:1.2, fibra:0.6};
  const TLS_BH_COST = {lte4g:1.0, fibmpls:1.0};

  /* ============ Caracterização genérica (Tabelas 20/21) — só para combinações customizadas ============ */

  const TECH_CAMPO = {
    lorawan: {label:"LoRaWAN (915 MHz)", lat:900, jit:300, loss:3,   avail:98.5, ber:-4, bw:5.5,  contention:"aloha",        capex:1, opex:1},
    rs485:   {label:"RS-485 serial",      lat:8,   jit:3,   loss:0.05,avail:99.7, ber:-6, bw:19.2, contention:"deterministic",capex:2, opex:1},
    nbiot:   {label:"NB-IoT Cat-NB2",     lat:300, jit:80,  loss:0.8, avail:99.2, ber:-5, bw:80,   contention:"noma",         capex:3, opex:3},
    wisun:   {label:"Wi-SUN mesh",        lat:55,  jit:30,  loss:0.4, avail:99.4, ber:-6, bw:150,  contention:"mesh",         capex:3, opex:2},
    zigbee:  {label:"ZigBee (802.15.4)",  lat:20,  jit:8,   loss:0.3, avail:99.3, ber:-6, bw:250,  contention:"csma",         capex:2, opex:1},
    ltem:    {label:"LTE-M (Cat-M1)",     lat:55,  jit:25,  loss:0.3, avail:99.5, ber:-6, bw:375,  contention:"qos",          capex:4, opex:3},
    fiveg:   {label:"5G NR (URLLC)",      lat:25,  jit:10,  loss:0.1, avail:99.9, ber:-7, bw:100000,contention:"qos",         capex:5, opex:4},
    fibra:   {label:"Fibra óptica (campo)",lat:0.5,jit:0.3, loss:0.01,avail:99.99,ber:-10,bw:100000,contention:"none",        capex:5, opex:2},
  };
  const PROTO_CAMPO = {
    mqttsn: {label:"MQTT-SN QoS 2",     addLat:0,  lossMult:1,   availDelta:0,    canonical:["lorawan"]},
    iec101: {label:"IEC 60870-5-101",   addLat:0,  lossMult:1,   availDelta:0,    canonical:["rs485"]},
    iec104: {label:"IEC 60870-5-104",   addLat:0,  lossMult:1,   availDelta:0,    canonical:["nbiot","ltem","wisun","zigbee"]},
    goose:  {label:"IEC 61850 GOOSE",   addLat:0,  lossMult:1,   availDelta:0,    canonical:["fibra","fiveg"]},
    mqtt1:  {label:"MQTT QoS 1",        addLat:8,  lossMult:0.9, availDelta:-0.05,canonical:[]},
    dnp3:   {label:"DNP3 (IEEE 1815)",  addLat:35, lossMult:0.85,availDelta:0.05, canonical:[]},
  };
  const TECH_BH = {
    lte4g:   {label:"4G LTE (APN privado + VPN IPsec)", lat:35, jit:12, loss:0.4, avail:99.7,  ber:-7,  bw:50000,  contention:"qos",  capex:2, opex:3},
    fibmpls: {label:"Fibra óptica + MPLS",               lat:3,  jit:1,  loss:0.01,avail:99.99, ber:-12, bw:1000000,contention:"none", capex:5, opex:2},
    radioip: {label:"Rádio IP / Micro-ondas",            lat:30, jit:10, loss:0.2, avail:99.9,  ber:-8,  bw:500000, contention:"qos",  capex:3, opex:2},
    fivegbh: {label:"5G NR (URLLC, backhaul)",           lat:5,  jit:2,  loss:0.05,avail:99.999,ber:-9,  bw:100000, contention:"qos",  capex:5, opex:4},
  };
  const PROTO_BH = {
    iec104b:{label:"IEC 60870-5-104",       addLat:0,  lossMult:1,  availDelta:0,    canonical:["lte4g"]},
    rgoose: {label:"IEC 61850 R-GOOSE",     addLat:0,  lossMult:1,  availDelta:0,    canonical:["fibmpls"]},
    iec104f:{label:"IEC 60870-5-104 (fibra)",addLat:3, lossMult:1.4,availDelta:-0.01,canonical:["radioip"]},
    dnp3b:  {label:"DNP3 (IEEE 1815)",      addLat:25, lossMult:0.8,availDelta:0.03, canonical:[]},
    iccp:   {label:"ICCP / TASE.2",         addLat:30, lossMult:1,  availDelta:0,    canonical:[]},
  };

  /* ============ Dados dos 5 Setups nomeados — Tabelas 25 a 34 (V41) ============ */

  const SETUPS_DATA = {
    A: {
      campoTechLabel:"LoRaWAN (SF7, BW 125 kHz, 915 MHz)", campoProtoLabel:"MQTT-SN QoS 2 → conversão no gateway",
      bhTechLabel:"4G LTE (APN privado, VPN IPsec, QoS DSCP EF)", bhProtoLabel:"IEC 60870-5-104 + TLS 1.3",
      campoTechKey:"lorawan", bhTechKey:"lte4g",
      campo:{lat:1450, jit:620, p99:2500, loss:5.8, ber:-4, avail:98.2},
      bh:{lat:47, jit:16, p99:119, loss:0.5, ber:-6, avail:99.5},
      loadRatio:{30:0.9235, 65:1, 95:1.1497},
      kpi04:{30:{media:1511,p99:2188,approx:true}, 65:{media:1628,p99:2750,approx:true}, 95:{media:1857,p99:3904,approx:true}},
      avalanche:{compliant:false, label:"Colapso do acesso ALOHA: 50 transmissões em 100 ms levam a probabilidade de sucesso na 1ª tentativa da ordem de 10⁻⁵; a entrega depende de sucessivas retransmissões.", lastGasp:"> 3 s (insuficiente)"},
      redundantType:"none", backupAvail:null,
      capex:1, opex:1,
      context:"Áreas rurais remotas sem alternativa celular — restrito a telemetria não crítica; 0 de 7 KPIs plenos, inadequado para alarme crítico.",
    },
    B: {
      campoTechLabel:"RS-485 serial (19,2 kbps, não balanceado, 15 DTMs/barramento)", campoProtoLabel:"IEC 60870-5-101 → gateway converte para IEC 60870-5-104",
      bhTechLabel:"4G LTE (APN privado, VPN IPsec, QoS DSCP EF)", bhProtoLabel:"IEC 60870-5-104 + TLS 1.3",
      campoTechKey:"rs485", bhTechKey:"lte4g",
      campo:{lat:12, jit:5, p99:28, loss:0.04, ber:-6, avail:99.8},
      bh:{lat:44, jit:14, p99:104, loss:0.5, ber:-6, avail:99.5},
      loadRatio:{30:0.7763, 65:1, 95:1.1974},
      kpi04:{30:{media:185,p99:264}, 65:{media:202,p99:303}, 95:{media:217,p99:337}},
      avalanche:{compliant:true, label:"≈ 1,0 s com polling de 15 DTMs/barramento, modo não balanceado (≈ 0,7 s no modo balanceado, limite teórico).", lastGasp:"≈ 0,8 s (≈ 0,5 s no modo balanceado)"},
      redundantType:"backhaul", backupAvail:99.99,
      capex:2, opex:1,
      context:"Retrofit de subestações legadas com RS-485 — viável limitando a 15 DTMs por barramento (≈ 4 barramentos para 50 transformadores); 4 de 7 KPIs plenos.",
    },
    C: {
      campoTechLabel:"NB-IoT Cat-NB2 (sem PSM, sempre conectado)", campoProtoLabel:"IEC 60870-5-104 nativo sobre TCP/IP",
      bhTechLabel:"4G LTE (APN privado, VPN IPsec, canal redundante LoRaWAN)", bhProtoLabel:"IEC 60870-5-104 + TLS 1.3",
      campoTechKey:"nbiot", bhTechKey:"lte4g",
      campo:{lat:147, jit:52, p99:380, loss:0.75, ber:-5, avail:99.3},
      bh:{lat:42, jit:13, p99:109, loss:0.5, ber:-6, avail:99.5},
      loadRatio:{30:0.6114, 65:1, 95:1.399},
      kpi04:{30:{media:229,p99:470}, 65:{media:304,p99:662}, 95:{media:381,p99:860}},
      avalanche:{compliant:"parcial", label:"≈ 2,1 s — a portadora NB-IoT, compartilhada por 50 DTMs, precisa transmitir sequencialmente; ≈ 1,05 s se a telemetria C3 for suspensa/priorizada durante o evento.", lastGasp:"≈ 1,7 s (+ restabelecimento da conexão RRC, se em modo ocioso)"},
      redundantType:"campo", backupAvail:98.2,
      capex:3, opex:3,
      context:"Áreas urbanas com cobertura NB-IoT consolidada, sem alternativa cabeada — 2 de 7 KPIs plenos; exige backup de campo (LoRaWAN) e ainda assim fica parcial no KPI-04 de avalanche.",
    },
    D: {
      campoTechLabel:"LTE-M no DTM (Cat-M1, HD-FDD, uplink 375 kbps)", campoProtoLabel:"IEC 60870-5-104 nativo sobre TCP/IP",
      bhTechLabel:"Fibra óptica + MPLS privado (Ethernet L3, 100 Mbps, SLA)", bhProtoLabel:"IEC 60870-5-104 + TLS 1.3",
      campoTechKey:"ltem", bhTechKey:"fibmpls",
      campo:{lat:30.8, jit:18, p99:95, loss:0.12, ber:-6, avail:99.6},
      bh:{lat:6.8, jit:2, p99:16.8, loss:0.02, ber:-12, avail:99.97},
      loadRatio:{30:0.725, 65:1, 95:1.25},
      kpi04:{30:{media:129,p99:184}, 65:{media:140,p99:218}, 95:{media:150,p99:247}},
      avalanche:{compliant:true, label:"≈ 0,36 s — célula LTE-M com ≈ 325 kbps residuais após a telemetria.", lastGasp:"≈ 0,16 s"},
      redundantType:"backhaul", backupAvail:99.99,
      capex:4, opex:3,
      context:"Áreas urbanas densas com LTE-M e fibra/MPLS disponíveis — 4 de 7 KPIs plenos, bom equilíbrio custo-desempenho sem fibra até o transformador.",
    },
    E: {
      campoTechLabel:"Fibra óptica single-mode (100BASE-FX, ≤ 2 km)", campoProtoLabel:"IEC 61850 GOOSE multicast (VLAN 802.1Q, CoS=7)",
      bhTechLabel:"Fibra óptica + MPLS privado (Ethernet L2/L3, 1 Gbps, MPLS-TE)", bhProtoLabel:"IEC 61850 R-GOOSE + MMS/TLS 1.3",
      campoTechKey:"fibra", bhTechKey:"fibmpls",
      campo:{lat:0.4, jit:0.4, p99:1.2, loss:0.01, ber:-10, avail:99.99},
      bh:{lat:3, jit:1, p99:6, loss:0.01, ber:-12, avail:99.99},
      loadRatio:{30:0.9792, 65:1, 95:1.0208},
      kpi04:{30:{media:105,p99:108}, 65:{media:105,p99:109}, 95:{media:105,p99:109}},
      avalanche:{compliant:true, label:"≈ 0,16 s — switch de borda / fibra (100 Mbps no campo).", lastGasp:"Desprezível (switch e gateway com alimentação ininterrupta)"},
      redundantType:"backhaul", backupAvail:99.99,
      capex:5, opex:2,
      context:"Subestações críticas e transformadores de alta potência — único Setup com 7 de 7 KPIs plenos; canal redundante não é necessário.",
    },
  };

  const TARGETS = {
    latCampo:100, latCampoP99:100, latBH:100, latBHP99:200,
    jitSeg:10, lossSeg:0.1, berSeg:-6,
    latE2E:200, latE2EP99:300, jitE2E:10, lossE2E:0.1, availE2E:99.9, berE2E:-6,
    alarmLat:2000,
  };
  const SENSITIVITY = {aloha:1.0, noma:0.55, qos:0.35, mesh:0.32, csma:0.4, deterministic:0.08, none:0.02};

  /* ============ Estado ============ */

  let setups = [];
  let nextId = 1;
  let lastResults = null;

  function makeNamedSetup(key, colorIdx){
    const d = SETUPS_DATA[key];
    return {
      id:"s"+(nextId++), kind:"named", namedKey:key, name:"Setup "+key+" — "+(key==="A"?"LoRaWAN + 4G LTE":key==="B"?"RS-485 + 4G LTE":key==="C"?"NB-IoT + 4G LTE":key==="D"?"LTE-M + Fibra":"Fibra nos dois trechos"),
      secCampo:true, secBH:true, redundant: d.redundantType!=="none",
      color: SETUP_COLORS[colorIdx % SETUP_COLORS.length],
    };
  }

  function makeCustomSetup(campoTech, campoProto, bhTech, bhProto, colorIdx){
    return {
      id:"s"+(nextId++), kind:"custom",
      name:"Combinação customizada", campo:{tech:campoTech,proto:campoProto}, bh:{tech:bhTech,proto:bhProto},
      secCampo:true, secBH:true, redundant:false,
      color: SETUP_COLORS[colorIdx % SETUP_COLORS.length],
    };
  }

  function loadDefaultSetups(){
    setups = ["A","B","C","D","E"].map((k,i)=>makeNamedSetup(k,i));
  }

  function namedKeyForCustom(setup){
    // combinação customizada nunca "cai" sobre um Setup nomeado: dropdowns de customizado ficam sempre em "custom"
    return null;
  }

  /* ============ Cálculo: Setups nomeados (dado de referência V41) ============ */

  function interpAt(points, x){
    const keys = Object.keys(points).map(Number).sort((a,b)=>a-b);
    if(x <= keys[0]) return points[keys[0]];
    if(x >= keys[keys.length-1]) return points[keys[keys.length-1]];
    for(let i=0;i<keys.length-1;i++){
      const a=keys[i], b=keys[i+1];
      if(x>=a && x<=b){ const t=(x-a)/(b-a); return points[a] + t*(points[b]-points[a]); }
    }
    return points[keys[keys.length-1]];
  }

  function interpKpi04(table, x){
    const keys=[30,65,95];
    if(x<=30) return table[30];
    if(x>=95) return table[95];
    for(let i=0;i<keys.length-1;i++){
      const a=keys[i], b=keys[i+1];
      if(x>=a && x<=b){
        const t=(x-a)/(b-a);
        return {
          media: table[a].media + t*(table[b].media-table[a].media),
          p99: table[a].p99 + t*(table[b].p99-table[a].p99),
          approx: table[a].approx || table[b].approx,
        };
      }
    }
    return table[95];
  }

  function computeNamed(setup, load, avalanche){
    const d = SETUPS_DATA[setup.namedKey];
    const r = interpAt(d.loadRatio, load);

    function seg(base, secCost, secOn){
      const lat0 = base.lat + (secOn? secCost : 0);
      const p990 = base.p99 + (secOn? secCost : 0);
      const lat = lat0 * r;
      const p99 = p990 * r;
      const jit = base.jit * r;
      const loss = Math.min(100, base.loss * Math.pow(r,1.3));
      const availGap = Math.max(0,(100-base.avail)) * Math.pow(r,1.15);
      const avail = Math.max(50, 100-availGap);
      return {lat, p99, jit, loss, avail, ber:base.ber};
    }

    const campoSecCost = SEC02_COST[d.campoTechKey] || 1;
    const bhSecCost = TLS_BH_COST[d.bhTechKey] || 1;
    const campo = seg(d.campo, campoSecCost, setup.secCampo);
    const bh = seg(d.bh, bhSecCost, setup.secBH);

    const jitE2E = Math.sqrt(campo.jit*campo.jit + bh.jit*bh.jit);
    const latE2E = campo.lat + bh.lat;
    const p99E2E = campo.p99 + bh.p99;
    const lossE2E = Math.min(100, 100*(1-(1-campo.loss/100)*(1-bh.loss/100)));
    const berE2E = Math.max(campo.ber, bh.ber);

    let campoAvailEff = campo.avail, bhAvailEff = bh.avail;
    if(setup.redundant && d.redundantType==="backhaul"){
      bhAvailEff = d.backupAvail;
    } else if(setup.redundant && d.redundantType==="campo"){
      campoAvailEff = 100 - (100-campo.avail)*(100-d.backupAvail)/100;
    }
    const availE2E = campoAvailEff * bhAvailEff / 100;

    let kpi04;
    if(avalanche){
      kpi04 = {avalanche:true, label:d.avalanche.label, compliant:d.avalanche.compliant, lastGasp:d.avalanche.lastGasp};
    } else {
      const k = interpKpi04(d.kpi04, load);
      kpi04 = {avalanche:false, media:k.media, p99:k.p99, approx:k.approx,
        compliant: !k.approx && k.media<=TARGETS.alarmLat && k.p99<=TARGETS.alarmLat};
    }

    const campoSecApplicable = true, bhSecApplicable = true;
    const score = {on:(setup.secCampo?1:0)+(setup.secBH?1:0), total:2, pct:((setup.secCampo?1:0)+(setup.secBH?1:0))/2*100};

    return {
      campo, bh, e2e:{lat:latE2E, p99:p99E2E, jit:jitE2E, loss:lossE2E, ber:berE2E, avail:availE2E},
      kpi04, source:"ref", context:d.context, capex:d.capex, opex:d.opex,
      redundantType:d.redundantType,
      security:{score, campoApplicable:campoSecApplicable, campoOn:setup.secCampo, bhApplicable:bhSecApplicable, bhOn:setup.secBH,
        campoCost:campoSecCost, bhCost:bhSecCost},
    };
  }

  /* ============ Cálculo: combinação customizada (genérico, Tabelas 20/21) ============ */

  function computeCustom(setup, load, avalanche){
    const ct = TECH_CAMPO[setup.campo.tech], cp = PROTO_CAMPO[setup.campo.proto];
    const bt = TECH_BH[setup.bh.tech], bp = PROTO_BH[setup.bh.proto];

    function segFactor(contention){
      let f = 1 + (SENSITIVITY[contention]||0.3) * ((load-65)/35);
      return Math.max(0.6, f);
    }
    function buildSeg(tech, proto){
      const f = segFactor(tech.contention);
      const lat = tech.lat*f + proto.addLat;
      const jit = tech.jit*f;
      const loss = Math.min(100, tech.loss*(proto.lossMult||1)*Math.pow(f,1.3));
      const avail = Math.max(50, tech.avail + (proto.availDelta||0) - (f-1)*8);
      const p99 = lat + 3.5*jit;
      return {lat, jit, p99, loss, ber:tech.ber, avail};
    }

    const campoBase = buildSeg(ct, cp), bhBase = buildSeg(bt, bp);
    const campoSecCost = SEC02_COST[setup.campo.tech] || 1;
    const bhSecCost = TLS_BH_COST[setup.bh.tech] || 1;
    const campo = {...campoBase, lat:campoBase.lat+(setup.secCampo?campoSecCost:0), p99:campoBase.p99+(setup.secCampo?campoSecCost:0)};
    const bh = {...bhBase, lat:bhBase.lat+(setup.secBH?bhSecCost:0), p99:bhBase.p99+(setup.secBH?bhSecCost:0)};

    const jitE2E = Math.sqrt(campo.jit*campo.jit + bh.jit*bh.jit);
    const latE2E = campo.lat+bh.lat, p99E2E = campo.p99+bh.p99;
    const lossE2E = Math.min(100, 100*(1-(1-campo.loss/100)*(1-bh.loss/100)));
    const berE2E = Math.max(campo.ber, bh.ber);
    let availE2E = campo.avail*bh.avail/100;
    if(setup.redundant) availE2E = campo.avail; // aproximação genérica: redundância só no backhaul
    const alarmMedia = latE2E*2+100, alarmP99 = p99E2E*2+100;
    const kpi04 = avalanche
      ? {avalanche:true, label:"Sem cenário de avalanche validado para combinações customizadas — use um dos cinco Setups nomeados.", compliant:null, lastGasp:"—"}
      : {avalanche:false, media:alarmMedia, p99:alarmP99, compliant:alarmMedia<=TARGETS.alarmLat && alarmP99<=TARGETS.alarmLat};

    const score = {on:(setup.secCampo?1:0)+(setup.secBH?1:0), total:2, pct:((setup.secCampo?1:0)+(setup.secBH?1:0))/2*100};

    return {
      campo, bh, e2e:{lat:latE2E,p99:p99E2E,jit:jitE2E,loss:lossE2E,ber:berE2E,avail:availE2E},
      kpi04, source:"est",
      context:`Estimativa genérica (Tabelas 20/21) — ${ct.label} (campo) + ${bt.label} (backhaul). Sem modelo de colisão/polling específico.`,
      capex:Math.round((ct.capex+bt.capex)/2), opex:Math.round((ct.opex+bt.opex)/2),
      redundantType: setup.redundant?"backhaul":"none",
      security:{score, campoApplicable:true, campoOn:setup.secCampo, bhApplicable:true, bhOn:setup.secBH, campoCost:campoSecCost, bhCost:bhSecCost},
    };
  }

  function computeSetup(setup, load, avalanche){
    return setup.kind==="named" ? computeNamed(setup, load, avalanche) : computeCustom(setup, load, avalanche);
  }

  /* ============ Formatação ============ */

  function fmt(v, digits){
    if(v===null||v===undefined||!isFinite(v)) return "—";
    if(digits===undefined) digits = v<10?2:(v<100?1:0);
    return v.toLocaleString("pt-BR",{minimumFractionDigits:digits,maximumFractionDigits:digits});
  }
  function fmtBer(exp){ return "10⁻"+toSuperscript(Math.abs(exp)); }
  function toSuperscript(n){
    const map={0:"⁰",1:"¹",2:"²",3:"³",4:"⁴",5:"⁵",6:"⁶",7:"⁷",8:"⁸",9:"⁹"};
    return String(n).split("").map(d=>map[d]||d).join("");
  }
  function flagIcon(kind){
    return kind==="ok" ? '<span class="flag ok"><span class="dot"></span>OK</span>'
      : kind==="warn" ? '<span class="flag warn"><span class="dot"></span>Parcial</span>'
      : kind==="na" ? '<span class="flag" style="color:var(--ink-muted)"><span class="dot"></span>N/A</span>'
      : '<span class="flag bad"><span class="dot"></span>Falha</span>';
  }
  function evalMetric(value, target, kind, warnFactor){
    if(kind==="lower"){
      warnFactor = warnFactor||1.3;
      if(value<=target) return "ok";
      if(value<=target*warnFactor) return "warn";
      return "bad";
    }
    if(kind==="higher"){
      if(value>=target) return "ok";
      if(value>=target-0.3) return "warn";
      return "bad";
    }
    if(kind==="ber"){
      if(value<=target) return "ok";
      if(value<=target+1) return "warn";
      return "bad";
    }
    return "ok";
  }

  /* ============ Render: cartões de Setup ============ */

  const grid = document.getElementById("setupsGrid");
  const setupCountEl = document.getElementById("setupCount");

  function optionsHtml(map, selected){
    return Object.keys(map).map(k=>`<option value="${k}" ${k===selected?"selected":""}>${map[k].label}</option>`).join("");
  }

  function secBlockHtml(setup, res){
    const campoCost = res.security.campoCost, bhCost = res.security.bhCost;
    const campoHint = ` <span class="cost-hint">(${setup.secCampo?"+":"custo "}${fmt(campoCost,1)} ms)</span>`;
    const bhHint = ` <span class="cost-hint">(${setup.secBH?"+":"custo "}${fmt(bhCost,1)} ms)</span>`;
    const campoLabel = setup.kind==="named"
      ? (setup.namedKey==="A" ? "HMAC-SHA256 em GOOSE/payload (SEC-02) — serialização sobre LoRaWAN"
        : setup.namedKey==="B" ? "Túnel de criptografia + HMAC-SHA256 dedicado no RS-485 (SEC-02, IEC 62443 SL2)"
        : setup.namedKey==="E" ? "HMAC-SHA256 em GOOSE/SV (SEC-02, IEC 62351-6)"
        : "TLS 1.3 + HMAC-SHA256 ponta a ponta (SEC-01/02)")
      : "Controle de integridade/autenticação de payload (SEC-02/03)";
    const bhLabel = "TLS 1.3 mútuo com X.509/PKI + anti-replay (SEC-01, SEC-07)";
    return `
      <div class="sec-block-title">
        <span>🔒 Segurança</span>
        <span class="sec-score" style="margin-left:auto">Índice: <b>${Math.round(res.security.score.pct)}%</b> (${res.security.score.on}/${res.security.score.total})</span>
      </div>
      <div class="sec-trecho">
        <div class="sec-trecho-head"><span class="name2">Campo → Borda</span></div>
        <div class="sec-tls-row">
          <label class="switch"><input type="checkbox" data-role="secCampo" ${setup.secCampo?"checked":""}><span class="track"><span class="thumb"></span></span></label>
          <label class="chip ${setup.secCampo?'on':''}" style="border:none;padding:0;background:none;cursor:default;">${campoLabel}${campoHint}</label>
        </div>
      </div>
      <div class="sec-trecho">
        <div class="sec-trecho-head"><span class="name2">Borda → Centro</span></div>
        <div class="sec-tls-row">
          <label class="switch"><input type="checkbox" data-role="secBH" ${setup.secBH?"checked":""}><span class="track"><span class="thumb"></span></span></label>
          <label class="chip ${setup.secBH?'on':''}" style="border:none;padding:0;background:none;cursor:default;">${bhLabel}${bhHint}</label>
        </div>
      </div>
    `;
  }

  function renderSetups(){
    grid.innerHTML = "";
    const load = Number(document.getElementById("loadRange").value);
    const avalanche = document.getElementById("faultToggle").checked;

    setups.forEach(s => {
      const res = computeSetup(s, load, avalanche);
      const card = document.createElement("div");
      card.className = "setup-card";
      card.style.setProperty("--swatch", s.color);
      const isNamed = s.kind==="named";

      let body;
      if(isNamed){
        const d = SETUPS_DATA[s.namedKey];
        const redundLabel = d.redundantType==="none" ? '<span class="redund-note">Canal redundante não previsto para este Setup.</span>'
          : `<div class="toggle-row"><label class="switch"><input type="checkbox" data-role="redundant" ${s.redundant?"checked":""}></label><span class="track"><span class="thumb"></span></span><label>Canal redundante ativo</label></div>`;
        body = `
          <div class="trecho-block"><div class="trecho-label"><span>Campo</span><span class="arrow">→</span><span>Borda</span></div>${d.campoTechLabel} · ${d.campoProtoLabel}</div>
          <div class="trecho-block"><div class="trecho-label"><span>Borda</span><span class="arrow">→</span><span>Centro</span></div>${d.bhTechLabel} · ${d.bhProtoLabel}</div>
          <div class="card-foot">${d.redundantType==="none" ? '<span class="redund-note">Canal redundante não previsto (Tabela 26).</span>' :
            `<div class="toggle-row"><label class="switch"><input type="checkbox" data-role="redundant" ${s.redundant?"checked":""}><span class="track"><span class="thumb"></span></span></label><label>Canal redundante ativo (${d.redundantType==="campo"?"campo":"backhaul"})</label></div>`}
          </div>
        `;
      } else {
        body = `
          <div class="trecho-block">
            <div class="trecho-label"><span>Campo</span><span class="arrow">→</span><span>Borda</span></div>
            <div class="select-row">
              <select data-role="campoTech">${optionsHtml(TECH_CAMPO, s.campo.tech)}</select>
              <select data-role="campoProto">${optionsHtml(PROTO_CAMPO, s.campo.proto)}</select>
            </div>
          </div>
          <div class="trecho-block">
            <div class="trecho-label"><span>Borda</span><span class="arrow">→</span><span>Centro</span></div>
            <div class="select-row">
              <select data-role="bhTech">${optionsHtml(TECH_BH, s.bh.tech)}</select>
              <select data-role="bhProto">${optionsHtml(PROTO_BH, s.bh.proto)}</select>
            </div>
          </div>
          <div class="card-foot">
            <div class="toggle-row"><label class="switch"><input type="checkbox" data-role="redundant" ${s.redundant?"checked":""}><span class="track"><span class="thumb"></span></span></label><label>Canal redundante ativo</label></div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="head">
          <span class="swatch-dot"></span>
          <span class="name mono">${s.name}</span>
          <span class="badge ${isNamed?'ref':'est'}">${isNamed?'Setup de referência (V41)':'Combinação customizada'}</span>
          ${isNamed?'':'<button class="remove-btn" data-role="remove" title="Remover" aria-label="Remover">✕</button>'}
        </div>
        ${body}
        <div class="sec-block" data-role="secBlock">${secBlockHtml(s, res)}</div>
      `;
      grid.appendChild(card);

      const secBlockEl = card.querySelector('[data-role="secBlock"]');
      secBlockEl.querySelectorAll('[data-role="secCampo"]').forEach(el=>el.addEventListener("change", e=>{ s.secCampo=e.target.checked; renderSetups(); }));
      secBlockEl.querySelectorAll('[data-role="secBH"]').forEach(el=>el.addEventListener("change", e=>{ s.secBH=e.target.checked; renderSetups(); }));
      card.querySelectorAll('[data-role="redundant"]').forEach(el=>el.addEventListener("change", e=>{ s.redundant=e.target.checked; renderSetups(); }));

      if(!isNamed){
        const rm = card.querySelector('[data-role="remove"]');
        if(rm) rm.addEventListener("click", ()=>{ setups = setups.filter(x=>x.id!==s.id); renderSetups(); });
        card.querySelector('[data-role="campoTech"]').addEventListener("change", e=>{ s.campo.tech=e.target.value; renderSetups(); });
        card.querySelector('[data-role="campoProto"]').addEventListener("change", e=>{ s.campo.proto=e.target.value; renderSetups(); });
        card.querySelector('[data-role="bhTech"]').addEventListener("change", e=>{ s.bh.tech=e.target.value; renderSetups(); });
        card.querySelector('[data-role="bhProto"]').addEventListener("change", e=>{ s.bh.proto=e.target.value; renderSetups(); });
      }
    });

    if(setups.length < 8){
      const addBtn = document.createElement("button");
      addBtn.className = "add-setup-btn";
      addBtn.innerHTML = "+ Adicionar combinação customizada";
      addBtn.addEventListener("click", ()=>{
        setups.push(makeCustomSetup("ltem","iec104","lte4g","iec104b", setups.length));
        renderSetups();
      });
      grid.appendChild(addBtn);
    }
    setupCountEl.textContent = `(${setups.length} de 8)`;
  }

  /* ============ Render: tabela de KPIs ============ */

  function kpisPassed(res){
    const checks = [
      evalMetric(res.e2e.lat, TARGETS.latE2E, "lower")==="ok",
      evalMetric(res.e2e.p99, TARGETS.latE2EP99, "lower")==="ok",
      evalMetric(res.e2e.jit, TARGETS.jitE2E, "lower")==="ok",
      evalMetric(res.e2e.loss, TARGETS.lossE2E, "lower")==="ok",
      evalMetric(res.e2e.avail, TARGETS.availE2E, "higher")==="ok",
      evalMetric(res.e2e.ber, TARGETS.berE2E, "ber")==="ok",
      !res.kpi04.avalanche
        ? (res.kpi04.media<=TARGETS.alarmLat && res.kpi04.p99<=TARGETS.alarmLat && !res.kpi04.approx)
        : (res.kpi04.compliant===true),
    ];
    return checks.filter(Boolean).length;
  }

  function renderTable(results){
    const table = document.getElementById("kpiTable");
    const cols = results;
    let head = `<thead><tr><th>KPI</th><th class="target-cell">Meta</th>`;
    cols.forEach(r=> head += `<th style="color:${r.setup.color}">${r.setup.name}</th>`);
    head += `</tr></thead>`;

    function rowEval(label, targetLabel, target, getter, kind, digits, warnFactor){
      let r = `<tr><td>${label}</td><td class="target-cell">${targetLabel}</td>`;
      cols.forEach(c=>{
        const v = getter(c.res);
        if(v===null||v===undefined||!isFinite(v)){
          r += `<td class="setup-col">${flagIcon("bad")}<br><span class="num" style="color:var(--ink-muted)">—</span></td>`;
          return;
        }
        const status = kind==="ber" ? evalMetric(v,target,"ber") : evalMetric(v,target,kind,warnFactor);
        const shown = kind==="ber" ? fmtBer(v) : fmt(v,digits);
        r += `<td class="setup-col">${flagIcon(status)}<br><span class="num">${shown}</span></td>`;
      });
      return r+`</tr>`;
    }
    function sectionRow(label){ return `<tr class="section-row"><td colspan="${cols.length+2}">${label}</td></tr>`; }
    function noteRow(text){ return `<tr class="note-row"><td colspan="${cols.length+2}">${text}</td></tr>`; }

    let body = "<tbody>";
    body += sectionRow("Trecho Campo → Borda");
    body += rowEval("Latência média","≤ 100 ms",TARGETS.latCampo, r=>r.campo.lat,"lower");
    body += rowEval("Latência p99 (KPI-02)","≤ 100 ms",TARGETS.latCampoP99, r=>r.campo.p99,"lower");
    body += rowEval("Jitter","≤ 10 ms",TARGETS.jitSeg, r=>r.campo.jit,"lower");
    body += rowEval("Perda de pacotes","≤ 0,1%",TARGETS.lossSeg, r=>r.campo.loss,"lower");
    body += rowEval("BER","≤ 10⁻⁶",TARGETS.berSeg, r=>r.campo.ber,"ber");
    body += rowEval("Disponibilidade (informativo)","≥ 99,9%",99.9, r=>r.campo.avail,"higher",2);

    body += sectionRow("Trecho Borda → Centro de Controle");
    body += rowEval("Latência média","≤ 100 ms",TARGETS.latBH, r=>r.bh.lat,"lower");
    body += rowEval("Latência p99 (KPI-03)","≤ 200 ms",TARGETS.latBHP99, r=>r.bh.p99,"lower");
    body += rowEval("Jitter","≤ 10 ms",TARGETS.jitSeg, r=>r.bh.jit,"lower");
    body += rowEval("Perda de pacotes","≤ 0,1%",TARGETS.lossSeg, r=>r.bh.loss,"lower");
    body += rowEval("BER","≤ 10⁻⁶",TARGETS.berSeg, r=>r.bh.ber,"ber");
    body += rowEval("Disponibilidade (informativo)","≥ 99,9%",99.9, r=>r.bh.avail,"higher",2);

    body += sectionRow("Fim a fim (Campo → Centro de Controle)");
    body += rowEval("Latência end-to-end (média)","≤ 200 ms",TARGETS.latE2E, r=>r.e2e.lat,"lower");
    body += rowEval("Latência end-to-end (p99)","≤ 300 ms",TARGETS.latE2EP99, r=>r.e2e.p99,"lower");
    body += noteRow("p99 fim a fim = soma dos p99 por trecho (limite superior conservador, não o percentil exato da soma).");
    body += rowEval("Jitter end-to-end","≤ 10 ms",TARGETS.jitE2E, r=>r.e2e.jit,"lower");
    body += noteRow("Combinado por soma quadrática (RMS): jit_e2e = √(jit_campo² + jit_bh²).");
    body += rowEval("Perda de pacotes","≤ 0,1%",TARGETS.lossE2E, r=>r.e2e.loss,"lower");
    body += rowEval("Disponibilidade end-to-end","≥ 99,9%",TARGETS.availE2E, r=>r.e2e.avail,"higher",2);
    body += rowEval("BER (enlace mais crítico)","≤ 10⁻⁶",TARGETS.berE2E, r=>r.e2e.ber,"ber");

    body += sectionRow("Entrega de alarme crítico (KPI-04)");
    body += `<tr><td>Latência de entrega — média</td><td class="target-cell">≤ 2.000 ms</td>` +
      cols.map(c=>{
        const k = c.res.kpi04;
        if(k.avalanche){
          return `<td class="setup-col">${flagIcon(k.compliant===true?"ok":k.compliant==="parcial"?"warn":"bad")}<br><span class="num" style="font-size:10.5px;white-space:normal">${k.compliant===true?"OK":k.compliant==="parcial"?"Parcial":"Falha"}</span></td>`;
        }
        const status = evalMetric(k.media, TARGETS.alarmLat, "lower");
        return `<td class="setup-col">${flagIcon(status)}<br><span class="num">${fmt(k.media,0)}</span></td>`;
      }).join("") + `</tr>`;
    body += `<tr><td>Latência de entrega — p99</td><td class="target-cell">≤ 2.000 ms</td>` +
      cols.map(c=>{
        const k = c.res.kpi04;
        if(k.avalanche){
          return `<td class="setup-col"><span class="num" style="font-size:10.5px;white-space:normal;color:var(--ink-muted)">ver nota</span></td>`;
        }
        const status = evalMetric(k.p99, TARGETS.alarmLat, "lower");
        const prefix = k.approx ? "&gt; " : "";
        return `<td class="setup-col">${flagIcon(k.approx?"warn":status)}<br><span class="num">${prefix}${fmt(k.p99,0)}</span></td>`;
      }).join("") + `</tr>`;
    body += `<tr class="note-row"><td colspan="${cols.length+2}" id="kpi04NoteCell"></td></tr>`;

    body += sectionRow("Segurança por trecho");
    body += `<tr><td>Controle de integridade/criptografia — Campo</td><td class="target-cell">Recomendado</td>` +
      cols.map(c=>`<td class="setup-col">${flagIcon(c.res.security.campoOn?"ok":"bad")}<br><span class="num">${c.res.security.campoOn?"Ativo":"Inativo"}</span></td>`).join("") + `</tr>`;
    body += `<tr><td>TLS 1.3 mútuo — Borda → Centro</td><td class="target-cell">Obrigatório (SEC-01)</td>` +
      cols.map(c=>`<td class="setup-col">${flagIcon(c.res.security.bhOn?"ok":"bad")}<br><span class="num">${c.res.security.bhOn?"Ativo":"Inativo"}</span></td>`).join("") + `</tr>`;
    body += `<tr><td>Overhead líquido de segurança (e2e)</td><td class="target-cell">informativo</td>` +
      cols.map(c=>{
        const net = (c.res.security.campoOn?c.res.security.campoCost:0) + (c.res.security.bhOn?c.res.security.bhCost:0);
        return `<td class="setup-col"><span class="num">+${fmt(net,1)} ms</span></td>`;
      }).join("") + `</tr>`;

    body += sectionRow("Síntese");
    body += `<tr><td>KPIs plenamente atendidos</td><td class="target-cell">7 de 7</td>` +
      cols.map(c=>{
        const n = kpisPassed(c.res);
        const status = n>=6?"ok":n>=3?"warn":"bad";
        return `<td class="setup-col">${flagIcon(status)}<br><span class="num">${n} de 7</span></td>`;
      }).join("") + `</tr>`;

    body += "</tbody>";
    table.innerHTML = head+body;

    const noteCell = document.getElementById("kpi04NoteCell");
    if(noteCell){
      const anyAvalanche = cols.some(c=>c.res.kpi04.avalanche);
      noteCell.innerHTML = anyAvalanche
        ? "Cenário de avalanche ativo: a célula mostra o resultado específico do Setup para 50 DTMs em 100 ms a 95% de carregamento (Tabela 33) — ver detalhe na síntese abaixo, não a interpolação por carga."
        : "Conformidade ao KPI-04 é julgada pelo p99 (mesmo critério dos KPI-02/03). Setup A: p99 só é conhecido como limite inferior (\"&gt;\") — a conformidade não pode ser demonstrada.";
    }
  }

  /* ============ Render: gráficos ============ */

  function renderBarChart(container, title, sub, results, getter, unit, target, higherBetter, digits){
    const wrap = document.createElement("div");
    wrap.className = "chart-card panel";
    let maxV = Math.max(...results.map(r=>getter(r.res)).filter(v=>isFinite(v)), target||0) * 1.15 || 1;
    let html = `<h3>${title}</h3><div class="sub">${sub}</div>`;
    results.forEach(r=>{
      const v = getter(r.res);
      const safe = isFinite(v) ? v : maxV;
      const pct = Math.min(100, (safe/maxV)*100);
      const status = isFinite(v) ? evalMetric(v, target, higherBetter?"higher":"lower") : "bad";
      const color = status==="ok" ? "var(--good)" : status==="warn" ? "var(--warn)" : "var(--bad)";
      const targetPct = target ? Math.min(100,(target/maxV)*100) : null;
      html += `<div class="bar-row">
        <div class="lbl" style="color:${r.setup.color}" title="${r.setup.name}">${r.setup.name}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
          ${targetPct!==null?`<div class="target-line" style="left:${targetPct}%"></div>`:""}
        </div>
        <div class="bar-val">${isFinite(v)?fmt(v,digits)+" "+unit:"falha"}</div>
      </div>`;
    });
    if(target) html += `<div class="legend-note"><span style="width:10px;height:2px;background:var(--ink-muted);display:inline-block"></span> meta: ${fmt(target,digits)} ${unit}</div>`;
    wrap.innerHTML = html;
    container.appendChild(wrap);
  }

  function renderCharts(results){
    const grid = document.getElementById("chartsGrid");
    grid.innerHTML = "";
    renderBarChart(grid, "Latência fim a fim (média)", "Campo → Centro de Controle", results, r=>r.e2e.lat, "ms", TARGETS.latE2E, false, undefined);
    renderBarChart(grid, "KPI-04 — latência de entrega (p99)", "Regime estacionário ou avalanche, conforme toggle", results, r=>r.kpi04.avalanche?NaN:r.kpi04.p99, "ms", TARGETS.alarmLat, false, 0);
    renderBarChart(grid, "Disponibilidade fim a fim", "Com redundância, onde aplicável", results, r=>r.e2e.avail, "%", TARGETS.availE2E, true, 2);
    renderBarChart(grid, "Perda de pacotes fim a fim", "Campo → Centro de Controle", results, r=>r.e2e.loss, "%", TARGETS.lossE2E, false, 2);
    renderBarChart(grid, "KPIs plenamente atendidos", "De 7 critérios estritos (Tabela 34)", results, r=>kpisPassed(r), "/7", 7, true, 0);
  }

  /* ============ Render: ranking ============ */

  function renderRanking(results){
    const grid = document.getElementById("rankingGrid");
    grid.innerHTML = "";
    const scored = results.map(r=>({...r, score:kpisPassed(r.res)})).sort((a,b)=>b.score-a.score);
    scored.forEach(r=>{
      const card = document.createElement("div");
      card.className = "rank-card";
      card.style.setProperty("--swatch", r.setup.color);
      const level = r.score>=6 ? "Plena adequação à monitoração crítica" : r.score>=4 ? "Adequação parcial — monitorar" : r.score>=2 ? "Uso restrito / telemetria não crítica" : "Inadequado para alarme crítico";
      card.innerHTML = `
        <div class="rank-head"><span class="rank-name">${r.setup.name}</span><span class="rank-score">${r.score}/7 KPIs</span></div>
        <p><b>${level}.</b></p>
        <p class="ctx">${r.res.context}</p>
      `;
      grid.appendChild(card);
    });
  }

  /* ============ CSV ============ */

  let downloadsCap = null;
  (async () => {
    try{ if(window.claude && typeof window.claude.use==="function") downloadsCap = await window.claude.use("downloads"); }
    catch(e){ downloadsCap = null; }
  })();

  async function exportCsv(results){
    if(!results) return;
    const rows = [["Setup","Trecho","Latência (ms)","Jitter (ms)","Perda (%)","BER","Disponibilidade (%)","KPI-04 média (ms)","KPI-04 p99 (ms)","KPIs plenos (de 7)"]];
    results.forEach(r=>{
      const n = kpisPassed(r.res);
      rows.push([r.setup.name,"Campo→Borda", fmt(r.res.campo.lat), fmt(r.res.campo.jit), fmt(r.res.campo.loss), fmtBer(r.res.campo.ber), fmt(r.res.campo.avail,2), "", "", ""]);
      rows.push([r.setup.name,"Borda→Centro", fmt(r.res.bh.lat), fmt(r.res.bh.jit), fmt(r.res.bh.loss), fmtBer(r.res.bh.ber), fmt(r.res.bh.avail,2), "", "", ""]);
      rows.push([r.setup.name,"Fim a fim", fmt(r.res.e2e.lat), fmt(r.res.e2e.jit), fmt(r.res.e2e.loss), fmtBer(r.res.e2e.ber), fmt(r.res.e2e.avail,2),
        r.res.kpi04.avalanche?"avalanche":fmt(r.res.kpi04.media,0), r.res.kpi04.avalanche?"avalanche":fmt(r.res.kpi04.p99,0), n]);
    });
    const csv = rows.map(row=>row.map(cell=>`"${String(cell).replace(/"/g,'""')}"`).join(";")).join("\n");
    const statusEl = document.getElementById("runStatus");
    if(!downloadsCap){ try{ downloadsCap = window.claude ? await window.claude.use("downloads") : null; }catch(e){ downloadsCap=null; } }
    if(downloadsCap){
      try{ await downloadsCap.save({filename:"comparativo_setups_v41.csv", data:"﻿"+csv}); }
      catch(err){ const code=err&&err.code; if(code!=="declined") statusEl.textContent="Não foi possível exportar o CSV ("+(code||"erro")+")."; }
    } else {
      statusEl.textContent = "Exportação de arquivo indisponível nesta visualização.";
    }
  }

  /* ============ Orquestração ============ */

  function runSimulation(){
    const load = Number(document.getElementById("loadRange").value);
    const avalanche = document.getElementById("faultToggle").checked;
    const dtms = Number(document.getElementById("dtmRange").value);

    const results = setups.map(s=>({setup:s, res: computeSetup(s, load, avalanche)}));
    lastResults = results;

    renderTable(results);
    renderCharts(results);
    renderRanking(results);

    document.getElementById("results").hidden = false;
    const reqBw = dtms*0.37;
    document.getElementById("runStatus").textContent =
      `Simulado com carga ${load}%, ${dtms} DTMs/gateway (≈${fmt(reqBw,1)} kbps requeridos para telemetria), ${avalanche?"cenário de avalanche (50 DTMs/100 ms, 95%)":"regime estacionário"}.`;
  }

  document.getElementById("loadRange").addEventListener("input", e=>{ document.getElementById("loadVal").textContent = e.target.value+"%"; });
  document.getElementById("dtmRange").addEventListener("input", e=>{ document.getElementById("dtmVal").textContent = e.target.value; });
  document.getElementById("faultToggle").addEventListener("change", e=>{
    document.getElementById("faultLabel").textContent = e.target.checked
      ? "Avalanche: 50 DTMs em 100 ms, carregamento de 95% (tempestade / desligamento do alimentador)"
      : "Regime estacionário (carga normal)";
    renderSetups();
  });
  document.getElementById("loadRange").addEventListener("change", renderSetups);

  document.getElementById("simulateBtn").addEventListener("click", runSimulation);
  document.getElementById("resetBtn").addEventListener("click", ()=>{ loadDefaultSetups(); renderSetups(); });
  document.getElementById("exportBtn").addEventListener("click", ()=>{ if(!lastResults) runSimulation(); exportCsv(lastResults); });
  window.claude && window.claude.use && window.claude.use("downloads").then(cap=>{ downloadsCap=cap; }).catch(()=>{});

  loadDefaultSetups();
  renderSetups();
  runSimulation();

})();
