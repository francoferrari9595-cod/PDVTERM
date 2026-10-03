
let dashboard=null, health=null, timer=null;

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const title=k=>String(k).replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\b\w/g,c=>c.toUpperCase());

function fmt(v){
 if(v===null||v===undefined||v==='')return '—';
 if(typeof v==='boolean')return v?'Sí':'No';
 if(typeof v==='number')return new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(v);
 if(typeof v==='string'){
  const d=Date.parse(v);
  if(!Number.isNaN(d)&&v.length>12)return new Date(d).toLocaleString('es-AR');
 }
 return String(v);
}

function flatten(obj,prefix='',out=[]){
 if(obj===null||obj===undefined)return out;
 if(Array.isArray(obj)){obj.forEach((v,i)=>flatten(v,prefix+'['+i+']',out));return out;}
 if(typeof obj==='object'){
  Object.entries(obj).forEach(([k,v])=>flatten(v,prefix?prefix+'.'+k:k,out));
  return out;
 }
 out.push({key:prefix,value:obj});
 return out;
}

function rows(target, obj, limit=80){
 const el=$(target);
 const data=flatten(obj).slice(0,limit);
 el.innerHTML=data.length?data.map(x=>`<div class="row"><div class="k">${esc(title(x.key))}</div><div class="v">${esc(fmt(x.value))}</div></div>`).join(''):'<div class="muted">Sin datos disponibles.</div>';
}

function findValue(obj,names){
 const all=flatten(obj);
 for(const n of names){
  const hit=all.find(x=>x.key.toLowerCase().endsWith(n.toLowerCase()));
  if(hit)return hit.value;
 }
 return null;
}

function metric(label,names,cls){
 const v=findValue(dashboard,names);
 return `<div class="metric ${cls||''}"><b>${esc(label)}</b><strong>${esc(fmt(v))}</strong></div>`;
}

function renderMetrics(){
 $('metrics').innerHTML=[
  metric('Ventas del turno',['ventas_del_turno','sales_total','total_sales','ventas'], 'gold'),
  metric('Tickets',['tickets_del_turno','ticket_count','tickets','sales_count'],'cyan'),
  metric('Productos activos',['productos_activos','products_count','active_products'],'green'),
  metric('Unidades en stock',['unidades_en_stock','stock_units','total_stock'],'cyan'),
  metric('Stock bajo',['stock_bajo','low_stock','low_stock_count'],'red'),
  metric('Deuda clientes',['deuda_clientes','credit_balance','customer_debt'],'red')
 ].join('');
}

function renderCommon(){
 rows('summaryRows',dashboard,45);
 rows('cashRows',pickObject(['cash','caja','cash_register','payments']),60);
 rows('paymentsRows',pickObject(['payments','pagos','payment_summary','medios_pago']),60);
 rows('productsRows',pickObject(['products','productos','inventory','inventario']),100);
 rows('stockRows',pickObject(['stock','inventario','inventory']),60);
 rows('customersRows',pickObject(['customers','clientes']),80);
 rows('operationsRows',pickObject(['tables','mesas','operations','operacion']),80);
 rows('ordersRows',pickObject(['orders','pedidos','reservations','reservas']),80);
 rows('activityRows',pickObject(['activity','actividad','events','eventos','logs']),100);
 rows('technicalRows',{store_id:dashboard.store_id,store_name:dashboard.store_name,sync_utc:dashboard.sync_utc,central_url:location.origin},30);
 rows('syncRows',{estado:dashboard.synchronized?'Sincronizado':'Pendiente',origen:'Windows Manager · base de datos local',tienda:dashboard.store_name,store_id:dashboard.store_id,ultima_actualizacion:dashboard.sync_utc,actualizacion_automatica:'10 segundos'},30);
 $('connectionRows').innerHTML=`<div class="row"><div class="k">Servidor</div><div class="v"><span class="status"><span class="dot"></span>Online</span></div></div>
 <div class="row"><div class="k">Base central</div><div class="v">${esc(health?.database||'ok')}</div></div>
 <div class="row"><div class="k">Tiendas registradas</div><div class="v">${esc(fmt(health?.stores))}</div></div>`;
}

function pickObject(names){
 for(const n of names){
  if(dashboard && dashboard[n]!==undefined)return dashboard[n];
 }
 const found=flatten(dashboard).filter(x=>names.some(n=>x.key.toLowerCase().includes(n)));
 return found.length?Object.fromEntries(found.map(x=>[x.key,x.value])):{};
}

function renderSales(){
 const q=($('saleSearch').value||'').toLowerCase();
 let list=[];
 for(const k of ['recent_sales','sales','ventas','tickets']){
  if(Array.isArray(dashboard?.[k])){list=dashboard[k];break;}
 }
 if(!Array.isArray(list))list=[];
 list=list.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
 if(!list.length){$('salesTable').innerHTML='<div class="muted">No hay ventas sincronizadas o no coinciden con la búsqueda.</div>';return;}
 const cols=[...new Set(list.flatMap(x=>typeof x==='object'?Object.keys(x):['venta']))].slice(0,8);
 $('salesTable').innerHTML='<table><thead><tr>'+cols.map(c=>`<th>${esc(title(c))}</th>`).join('')+'</tr></thead><tbody>'+
 list.slice(0,200).map(x=>'<tr>'+cols.map(c=>`<td>${esc(fmt(typeof x==='object'?x[c]:x))}</td>`).join('')+'</tr>').join('')+
 '</tbody></table>';
}

function renderJson(){
 let text=JSON.stringify(dashboard,null,2);
 const q=($('jsonSearch').value||'').toLowerCase();
 if(q){
  const lines=text.split('\n').filter(l=>l.toLowerCase().includes(q));
  $('jsonBox').textContent=lines.join('\n')||'Sin coincidencias.';
 }else $('jsonBox').textContent=text;
}

async function login(){
 $('err').textContent='';
 const r=await fetch('/api/v1/web/login',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({Username:$('u').value,Password:$('p').value,Remember:$('remember').checked})
 });
 if(!r.ok){$('err').textContent='Usuario o contraseña incorrectos.';return;}
 await showPanel();
}

/* ETAPA_7_WEB_INTERACTIVE_JS */
async function webCommand(type,payload){const r=await fetch('/api/v1/web/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,payload})});if(!r.ok)throw new Error(await r.text()||'No se pudo crear el comando');return await r.json();}
async function webWait(id){for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,1000));const r=await fetch('/api/v1/web/commands/'+id,{cache:'no-store'});if(!r.ok)throw new Error('No se pudo consultar el comando');const x=await r.json();if(x.status==='DONE')return x;if(x.status==='ERROR')throw new Error(x.error||'La instalación rechazó el cambio');}throw new Error('La tienda no respondió en 60 segundos');}
function webStatus(t){const e=document.getElementById('webActionStatus');if(e)e.textContent=t;}
async function webRun(type,payload){try{webStatus('Enviando '+type+'...');const c=await webCommand(type,payload);await webWait(c.command_id);webStatus('✓ Cambio aplicado. Actualizando...');await refresh(false);}catch(e){webStatus('✕ '+(e.message||e));}}
function webStock(){webRun('stock.adjust',{productId:Number(wa_product.value),quantityDelta:Number(wa_delta.value),reason:wa_reason.value||'Ajuste desde panel web'});}
function webPrice(){webRun('product.price',{productId:Number(wa_price_product.value),price:Number(wa_price.value),reason:wa_price_reason.value||'Cambio desde panel web'});}
function webCustomer(){webRun('customer.upsert',{id:Number(wa_customer_id.value||0),name:wa_customer_name.value,document:wa_customer_doc.value,phone:wa_customer_phone.value,email:wa_customer_email.value,address:wa_customer_address.value,creditLimit:Number(wa_customer_limit.value||0)});}
function webPayment(){webRun('customer.payment',{customerId:Number(wa_payment_customer.value),amount:Number(wa_payment_amount.value),method:wa_payment_method.value,concept:wa_payment_concept.value||'Abono desde panel web'});}
function webCash(){webRun('cash.movement',{movementType:wa_cash_type.value,amount:Number(wa_cash_amount.value),concept:wa_cash_concept.value||'Movimiento desde panel web',paymentMethod:wa_cash_method.value});}
function webExportDebts(){const list=(dashboard?.customers||dashboard?.clientes||[]).filter(x=>Number(x.debt||0)>0);const lines=[['Cliente','Documento','Telefono','Deuda'],...list.map(x=>[x.name,x.document,x.phone,x.debt])];const csv=lines.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='deudas_ferraripos.csv';a.click();}

async function showPanel(){
 const me=await fetch('/api/v1/web/me');
 if(!me.ok){$('loginBox').style.display='block';$('appBox').style.display='none';return;}
 const m=await me.json();
 $('loginBox').style.display='none';
 $('appBox').style.display='block';
 $('storeName').textContent=m.store_name;
 $('storeMeta').textContent='Tienda '+m.store_id+' · Cuenta '+m.web_username;
 await refresh(false);
 if(timer)clearInterval(timer);
 timer=setInterval(()=>refresh(false),10000);
}

async function refresh(manual){
 try{
  const [h,d]=await Promise.all([
   fetch('/health?ts='+Date.now(),{cache:'no-store'}),
   fetch('/api/v1/web/dashboard?ts='+Date.now(),{cache:'no-store'})
  ]);
  health=h.ok?await h.json():null;
  if(!d.ok){
   if(d.status===401){loginDiv();return;}
   throw new Error('dashboard');
  }
  const responseData=await d.json();
  dashboard=(responseData && responseData.data && typeof responseData.data==='object')
    ? Object.assign({},responseData,responseData.data)
    : responseData;
  // CACHE DE ÚLTIMO ESTADO: si Render pierde momentáneamente el Quick Tunnel,
  // nunca se elimina la última URL, QR ni iframe que ya estaban funcionando.
  const liveBox=$('liveCloudflareBox');
  const liveFrame=$('liveCloudflareFrame');
  const liveOpen=$('liveCloudflareOpen');
  let cachedLiveUrl='';
  let cachedQr='';
  let cachedCode='';
  try{
    cachedLiveUrl=localStorage.getItem('ferraripos_last_cloudflare_url')||'';
    cachedQr=localStorage.getItem('ferraripos_last_qr_png')||'';
    cachedCode=localStorage.getItem('ferraripos_last_qr_code')||'';
  }catch(_){ }
  const receivedLiveUrl=String(dashboard?.cloudflare_url||'').trim();
  const liveUrl=(receivedLiveUrl && receivedLiveUrl.includes('trycloudflare.com'))?receivedLiveUrl:cachedLiveUrl;
  if(receivedLiveUrl && receivedLiveUrl.includes('trycloudflare.com')){
    try{localStorage.setItem('ferraripos_last_cloudflare_url',receivedLiveUrl)}catch(_){ }
  }
  if(liveUrl && liveUrl.includes('trycloudflare.com')){
    const frameUrl=liveUrl.replace(/\/$/,'/')+'?ferraripos_live=1';
    // Nunca vaciar ni ocultar el iframe por un corte de red.
    // Solo se navega si realmente apareció un Quick Tunnel distinto.
    if(liveFrame.dataset.currentUrl!==frameUrl){
      liveFrame.dataset.currentUrl=frameUrl;
      liveFrame.src=frameUrl;
    }
    liveOpen.href=frameUrl;
    liveBox.style.display='block';
  } else if(liveFrame.dataset.currentUrl){
    // Conservar visualmente el último panel conocido aunque el polling falle.
    liveBox.style.display='block';
  }
  const pairing=dashboard?.mobile_pairing||{};
  const qrBox=$('managerQrBox');
  const qrImg=$('managerQrImage');
  const receivedQr=String(pairing.qr_png_base64||'').trim();
  const qrData=receivedQr||cachedQr;
  const qrCode=String(pairing.code||'').trim()||cachedCode;
  if(receivedQr){
    try{
      localStorage.setItem('ferraripos_last_qr_png',receivedQr);
      if(qrCode) localStorage.setItem('ferraripos_last_qr_code',qrCode);
    }catch(_){ }
  }
  if(qrData){
    qrImg.src='data:image/png;base64,'+qrData;
    $('managerQrCode').textContent=qrCode||'—';
    $('managerQrUrl').textContent=liveUrl||'—';
    $('managerQrStore').textContent=(dashboard?.store_name||$('storeName').textContent||'—')+' · '+(dashboard?.store_id||'—');
    $('qrStatus').textContent=receivedQr?'● QR EN VIVO · WINDOWS MANAGER':'● ÚLTIMO QR CONSERVADO';
    qrBox.style.display='block';
  } else if(cachedLiveUrl || liveFrame.dataset.currentUrl){
    // No ocultar la tarjeta si el servidor respondió temporalmente sin datos.
    qrBox.style.display='block';
  }
  $('connection').textContent=dashboard.synchronized?'● DATOS SINCRONIZADOS · WINDOWS MANAGER':'○ ESPERANDO DATOS';
  $('syncText').textContent=dashboard.sync_utc?'Última actualización: '+new Date(dashboard.sync_utc).toLocaleString('es-AR'):'Esperando primera sincronización';
  renderMetrics();renderCommon();renderSales();renderJson();
 }catch(e){
  // Corte temporal: conservar el último estado visible. No limpiar iframe, URL ni QR.
  $('connection').textContent='● CONEXIÓN TEMPORAL · ÚLTIMO ESTADO CONSERVADO';
  const liveBox=$('liveCloudflareBox');
  const liveFrame=$('liveCloudflareFrame');
  if(liveFrame.dataset.currentUrl){ liveBox.style.display='block'; }
  const cachedQr=localStorage.getItem('ferraripos_last_qr_png')||'';
  if(cachedQr){
    $('managerQrImage').src='data:image/png;base64,'+cachedQr;
    $('managerQrBox').style.display='block';
    $('qrStatus').textContent='● ÚLTIMO QR CONSERVADO';
  }
 }
}

function loginDiv(){
 if(timer)clearInterval(timer);
 $('loginBox').style.display='block';
 $('appBox').style.display='none';
}

async function logout(){
 await fetch('/api/v1/web/logout',{method:'POST'});
 loginDiv();
}

document.querySelectorAll('.tab').forEach(btn=>{
 btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
  $(btn.dataset.tab).classList.add('active');
 });
});

showPanel();
