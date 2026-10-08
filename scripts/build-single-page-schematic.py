#!/usr/bin/env python3
"""Draw the entire Revision G netlist as one continuous wiring schematic.

No embedded detail sheets. Revision G uses direct valve wiring and the Nano internal watchdog. Functional terminal positions
are deliberately arranged for tracing; this is not a PCB/connector footprint.
Requires Inkscape and pypdf. Geometry is also checked by check-docs.mjs in CI.
"""
from pathlib import Path
import hashlib, json, re, subprocess
import xml.etree.ElementTree as ET
from pypdf import PdfReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/assets/hardware'
DATA = ROOT / 'hardware/rev-g'
N = json.loads((DATA/'netlist.json').read_text())
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
W, H = 3600, 2546
NAVY, GRAY, RED = '#193348', '#516170', '#b9322c'
COLORS = {'MACHINE_12V':'#bd3530','LOGIC_5V':'#b46c00','0V':'#303c47',
          'SDA':'#008b81','SCL':'#8060b2','VALVE_12V':'#bd3530','RELAY_5V':'#bf7200'}
for name,file in [('Regular','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/dejavu/'+file))
sha = hashlib.sha256((DATA/'netlist.json').read_bytes()).hexdigest()
root = ET.Element(f'{{{NS}}}svg', {'width':'1189mm','height':'841mm','viewBox':f'0 0 {W} {H}',
 'data-netlist-sha256':sha,'data-sheet-count':'1','data-drawing-type':'continuous-wiring',
 'role':'img','aria-labelledby':'title desc'})
def el(tag, attrs=None, parent=None, **kw):
    return ET.SubElement(root if parent is None else parent, f'{{{NS}}}{tag}', {str(k):str(v) for k,v in {**(attrs or {}),**kw}.items()})
el('title',id='title').text='Rock-Saw Water Control — continuous Revision G wiring schematic'
el('desc',id='desc').text=f'All {len(N["wires"])} external wires on one connected page. Relay-free valve circuit; internal watchdog; all five input wires enter together at left.'
def rect(x,y,w,h,fill='#f1f5f8',stroke=NAVY,parent=None,**a):
    return el('rect',{'x':x,'y':y,'width':w,'height':h,'fill':fill,'stroke':stroke,'stroke-width':1.6,**a},parent)
def txt(x,y,s,size=17,bold=False,color=NAVY,parent=None,anchor='start',halo=False,rotate=None):
    a={'x':x,'y':y,'font-family':'DejaVu Sans','font-size':size,'fill':color,'text-anchor':anchor}
    if bold:a['font-weight']='bold'
    if halo:a.update({'paint-order':'stroke','stroke':'white','stroke-width':5,'stroke-linejoin':'round'})
    if rotate:a['transform']=f'rotate({rotate},{x},{y})'
    el('text',a,parent).text=s

def line(points,color=NAVY,width=2,parent=None,**attrs):
    return el('polyline',{'points':' '.join(f'{x},{y}' for x,y in points),'fill':'none','stroke':color,'stroke-width':width,**attrs},parent)
rect(0,0,W,H,'white','none')
rect(0,0,W,108,NAVY,'none')
txt(46,46,'ROCK-SAW WATER CONTROL',32,True,'white')
txt(46,79,'CONTINUOUS WIRING REFERENCE  /  REVISION G  /  8 OCTOBER 2026',19,False,'#d8e6ed')
txt(2520,43,f'ONE CONNECTED DRAWING · {len(N["wires"])} WIRES',23,True,'white')
txt(2520,78,'A0 landscape · vector PDF · keep the detailed booklet',17,False,'#d8e6ed')
txt(46,151,'Read by terminal name, not by physical pin position.',21,True)
txt(46,179,'Solid dot = joined wires. Gapped crossing = no connection. W-numbers match the connection register.',17)
txt(2080,151,'BENCH DESIGN — H1–H5 QUALIFICATION STILL REQUIRED',21,True,RED)
txt(2080,179,'Incoming labels are signal names, NOT machine connector cavity numbers.',17)

# Layers: components first; visible wires; crossing bridges; junctions; terminal labels.
comp_layer=el('g',id='components')
wire_layer=el('g',id='external-wires')
cross_layer=el('g',id='crossings')
dot_layer=el('g',id='junctions')
label_layer=el('g',id='terminal-labels')
G={ref:el('g',{'data-component-ref':ref,'data-component-part':c['part']},comp_layer) for ref,c in N['components'].items()}
P={};boxes={};rails={};routes={};wire_labels={}

def pin(ref,name,x,y,side=None,label=None,size=14,dy_override=None):
    key=f'{ref}.{name}';assert name in N['components'][ref]['pins'],key
    P[key]=(x,y)
    el('circle',{'cx':x,'cy':y,'r':4,'fill':'white','stroke':NAVY,'stroke-width':1.6,'data-pin':key},label_layer)
    if side:
        label=label or name
        dx,dy,anchor={'top':(0,24,'middle'),'bottom':(0,-13,'middle'),'left':(12,5,'start'),'right':(-12,5,'end')}[side]
        if dy_override is not None:dy=dy_override
        txt(x+dx,y+dy,label,size,False,parent=label_layer,anchor=anchor)
    return P[key]

def module(ref,x,y,w,h,title,subtitle,notes=(),title_y=64,rows=None):
    boxes[ref]=(x,y,w,h)
    g=G[ref]
    rect(x,y,w,h,parent=g,rx=9,**{'data-body':ref})
    rows=rows or [(title_y,ref+'  '+title,22,True),(title_y+29,subtitle,16,False)]+[(title_y+61+i*24,s,14,False) for i,s in enumerate(notes)]
    for yy,s,size,bold in rows:
        size=min(size,(w-26)/max(1,pdfmetrics.stringWidth(s,'Bold' if bold else 'Regular',1)))
        txt(x+w/2,y+yy,s,size,bold,parent=g,anchor='middle')

def passive(ref,x,y,kind,value,horizontal=False,reverse=False):
    """Pins at ±40; number order can reverse for the receiver resistor."""
    g=G[ref]
    boxes[ref]=(x-40,y-10,80,20) if horizontal else (x-16,y-40,32,80)
    if horizontal:
        a,b=(x-40,y),(x+40,y)
        names=('2','1') if reverse else ('1','2')
        pin(ref,names[0],*a);pin(ref,names[1],*b)
        line([a,(x-24,y)],parent=g);line([(x+24,y),b],parent=g)
        rect(x-24,y-9,48,18,'white',parent=g)
        txt(x-50 if ref in ['R1','R2','R3'] else x,y-32,ref,15,True,parent=g,anchor='middle');txt(x,y-14,value,13,parent=g,anchor='middle')
    else:
        a,b=(x,y-40),(x,y+40)
        names=('K','A') if kind=='diode' else (('+','-') if ref in ['C7','C8','C9'] else ('1','2'))
        pin(ref,names[0],*a);pin(ref,names[1],*b)
        if kind=='resistor':
            line([a,(x,y-24)],parent=g);line([(x,y+24),b],parent=g)
            rect(x-9,y-24,18,48,'white',parent=g)
        elif kind=='diode':
            line([a,(x,y-12)],parent=g);line([(x,y+16),b],parent=g)
            el('polygon',{'points':f'{x-12},{y+14} {x+12},{y+14} {x},{y-10}','fill':'white','stroke':NAVY,'stroke-width':2},g)
            line([(x-14,y-12),(x+14,y-12)],parent=g)
            txt(x-20,y-23,'K',12,parent=g,anchor='end')
            txt(x-20,y+32,'A',12,parent=g,anchor='end')
        else:
            line([a,(x,y-6)],parent=g);line([(x,y+6),b],parent=g)
            line([(x-15,y-6),(x+15,y-6)],width=3,parent=g)
            line([(x-15,y+6),(x+15,y+6)],width=3,parent=g)
            if names[0]=='+':txt(x-23,y-14,'+',17,True,parent=g,anchor='end')
        if kind=='diode' and ref!='D4':
            txt(x-27,y-4,ref,15,True,parent=g,anchor='end');txt(x-27,y+17,value,13,parent=g,anchor='end')
        elif ref=='D4':
            txt(x+21,y-4,ref,15,True,parent=g);txt(x,1204,value,13,parent=g,anchor='middle')
        elif ref in ['C5','C12']:
            txt(x-21,y-4,ref,15,True,parent=g,anchor='end');txt(x-21,y+17,value,11 if ref=='C12' else 13,parent=g,anchor='end')
        elif ref=='C9':
            txt(x+19,y-7,ref,15,True,parent=g)
            txt(x+19,y+12,'47 µF' if ref=='C9' else '100 nF',11,parent=g)
        else:
            txt(x+21,y-4,ref,15,True,parent=g);txt(x+21,y+17,value,13,parent=g)

# Ten lamps and the actual three power-driver boards.
centers=[345,635,925,1215,1595,1885,2175,2465,2860,3150]
for i,cx in enumerate(centers,1):
    ref=f'L{i}'
    module(ref,cx-95,225,190,105,'','12 V · TL-248BW',title_y=33)
    for name,xx in [('BLUE',cx-55),('WHITE',cx+5),('BLACK',cx+65)]:pin(ref,name,xx,330,'bottom',name,12)
for j,(xx,ww) in enumerate([(210,1100),(1460,1100),(2740,650)],1):
    ref=f'HSD{j}'
    module(ref,xx,480,ww,230,'HIGH-SIDE DRIVER','Serial Wombat PCB0046 HSD V2',
           (f'I²C 0x{0x5e+2*j:02X} / 0x{0x5f+2*j:02X} · 12 V lamp outputs',
            'V = logic 5 V; G = G0…G7 = LOAD_GND internally'),title_y=76)
    for m in N['lamp_channels']:
        if m['board']!=ref:continue
        for color,key in [('BLUE','blue'),('WHITE','white')]:
            pin(ref,f'CH{m[key]}',P[f'L{m["lamp"]}.{color}'][0],480,'top')
    for name,dx in [('VIN',80),('LOAD_GND',150),('V',450 if j<3 else 300),('D',600 if j<3 else 410),('C',680 if j<3 else 490)]:
        pin(ref,name,xx+dx,710,'bottom',{'LOAD_GND':'0 V','V':'V / 5 V','D':'D / SDA','C':'C / SCL'}.get(name,name))
    if j==3:
        txt(3220,673,'CH4–CH7: unused / off',14,parent=G[ref],anchor='end')
    passive(f'C{6+j}',xx+240,790,'capacitor','47 µF / 35 V')
    passive(f'C{9+j}',xx+365,790,'capacitor','100 nF')

# Joined distribution rails are real continuous conductors, not off-sheet labels.
for ref,net,y,label in [('TB12','MACHINE_12V',910,'TB12  MACHINE +12 V'),('TB5','LOGIC_5V',970,'TB5  REGULATED +5 V'),('TB0','0V',1120,'TB0  COMMON RETURN / 0 V')]:
    rails[ref]=[(70,y),(3520,y)]
    if ref=='TB0':rails[ref]+=[(3520,395),(240,395)]
    P[ref+'.rail']=(70,y)
    line(rails[ref],COLORS[net],4,G[ref],**{'data-rail':ref+'.rail','data-net':net})
    txt(75,y-15,label,19,True,COLORS[net],halo=True)
txt(480,434,'LAMP RETURNS — size for the sum of active lamp currents',15,True,halo=True)
txt(70,1035,'SDA',17,True,COLORS['SDA']);txt(70,1065,'SCL',17,True,COLORS['SCL'])

# Five wire entry points only, in the user's requested top-to-bottom order.
for name,y,lab in [('12V',1300,'12 V'),('0V',1360,'0 V'),('J',1420,'J'),('H',1480,'H'),('G',1540,'G')]:
    pin('IN',name,70,y)
    txt(72,y-16,lab,20,True,parent=G['IN'],halo=True)
for i,y in enumerate([1480,1590,1720],1):
    passive(f'R{i}',475,y,'resistor','1 kΩ / 0.5 W',horizontal=True)
    passive(f'D{i}',565,y+60,'diode','1N4148')
module('O1',690,1390,230,240,'','',rows=[(60,'O1  INPUTS G / H',19,True),(143,'BOB-09118 v1.2',15,False),(222,'JP2_1: no connection',13,False)])
module('O2',690,1670,230,210,'','',rows=[(79,'O2  INPUT J',20,True),(149,'BOB-09118 v1.2',15,False),(183,'OUT2, JP2_1: unused',13,False)])
for ref,y in [('O1',1390),('O2',1670)]:
    for name,x,label in [('INPUT_GND',750,'IN GND'),('HV',800,'HV'),('HV_GND',850,'HV GND')]:pin(ref,name,x,y,'top',label,11)
for name,y in [('IN1',1480),('IN2',1590)]:pin('O1',name,690,y,'left')
for name,y in [('OUT1',1490),('OUT2',1580)]:pin('O1',name,920,y,'right')
pin('O2','IN1',690,1720,'left');pin('O2','IN2',690,1780,'left');pin('O2','OUT1',920,1720,'right')
module('U1',1020,1410,330,370,'ARDUINO','Nano Every · ABX00028',('A4 / A5: local I²C bus','A0: valve position','D7 / D8 / D9: unused','','No flow or temperature sensors','USB: programming / service'),title_y=76)
for name,x in [('VIN',1060),('5V',1110),('GND1',1160),('A4',1210),('A5',1260)]:pin('U1',name,x,1410,'top',{'GND1':'GND'}.get(name,name),13)
for name,y in [('D2',1490),('D3',1580),('D4',1720)]:pin('U1',name,1020,y,'left')
pin('U1','A0',1350,1540,'right')


module('U3',1730,1450,300,240,'POSITION RECEIVER','DFRobot SEN0262',('4–20 mA → analog voltage','No extra 250 Ω shunt'),title_y=75)
for name,x in [('VCC',1810),('GND',1880),('I-',1960)]:pin('U3',name,x,1450,'top')
pin('U3','SIGNAL',1730,1540,'left');pin('U3','I+',2030,1610,'right')
passive('R4',1590,1540,'resistor','1 kΩ',horizontal=True,reverse=True)
passive('R5',1400,1690,'resistor','100 kΩ')
passive('C1',1510,1690,'capacitor','100 nF')
module('U2',2060,1260,260,210,'','',rows=[(62,'U2  CURRENT COMMAND',20,True),(128,'DFRobot DFR1229',15,False),(183,'0x58 · 4–20 mA',14,False)])
pin('U2','VCC',2130,1260,'top');pin('U2','GND',2200,1260,'top')
pin('U2','SDA',2060,1360,'left');pin('U2','SCL',2060,1420,'left');pin('U2','OUT',2320,1420,'right')

txt(2500,1330,'NANO INTERNAL WATCHDOG ONLY',20,True)
txt(2500,1365,'No external reset parts or valve-power switch.',16)
txt(2500,1400,'HSD3 CH4–CH7 remain unused and OFF.',16)
module('V1',3240,1500,280,400,'','',rows=[(64,'V1  VALVE + ACTUATOR',20,True),(139,'U.S. Solid USS-MSV50030',15,False),(166,'½-inch stainless · 9–24 V',14,False),(193,'Five-wire actuator cable',14,False),(264,'GREEN: command +',14,False),(289,'WHITE: signal common',14,False),(314,'YELLOW: feedback +',14,False),(351,'Shared machine power; no power cut',13,False)])
for name,x in [('RED',3270),('BLACK',3350),('WHITE',3430)]:pin('V1',name,x,1500,'top',name,12)
pin('V1','GREEN',3240,1600,'left','GREEN',12);pin('V1','YELLOW',3240,1720,'left','YELLOW',12)

# Endpoint-aware routing. Every ID is one real continuous drawn conductor.
by_id={w['id']:w for w in N['wires']}
def route(i,via=(),start=None,end=None,label=None):
    wid=f'W{i:03}';w=by_id[wid]
    pts=[start or P[w['from']],*via,end or P[w['to']]]
    pts=[p for j,p in enumerate(pts) if j==0 or p!=pts[j-1]]
    assert all(a[0]==b[0] or a[1]==b[1] for a,b in zip(pts,pts[1:])),(wid,pts)
    assert wid not in routes,wid
    routes[wid]=pts
    if label:wire_labels[wid]=label

def power(i,rail,via=(),tap=None,label=None):
    w=by_id[f'W{i:03}'];tx,ty=P[w['to']]
    y={'TB12':910,'TB5':970,'TB0':1120}[rail]
    route(i,via,start=tap or (tx,y),label=label)

for i in range(1,32):
    if f'W{i:03}' not in by_id: continue
    w=by_id[f'W{i:03}'];ref=w['from'].split('.')[0]
    # Wires requiring a path around a module, rather than a direct drop.
    special={
      1:([(270,1300)],(270,910)),
      6:([(310,1360)],(310,1120)),
      15:([(650,1650),(750,1650)],(650,1120)),
      16:([(980,1640),(850,1640)],(980,1120)),
      17:([(3500,1450),(3350,1450)],(3500,1120)),
      20:([(130,2030),(580,2030)],(130,1120)),
      21:([(2670,1320),(2790,1320)],(2670,1120)),
      22:([(3180,1410),(2960,1410)],(3180,1120)),
      30:([(965,1650),(800,1650)],(965,970)),
      31:([(100,2000),(500,2000)],(100,970)),
    }
    via,tap=special.get(i,((),None));power(i,ref,via,tap,label=(3173,1280,-90) if i==22 else None)
# SDA / SCL shared trunks physically drawn by each terminal-to-terminal path.
for i in range(32,40):
    w=by_id[f'W{i:03}'];a=P[w['from']];b=P[w['to']];y=1030 if i<36 else 1060
    bx=b[0]
    if w['to']=='U2.SDA':route(i,[(a[0],y),(2020,y),(2020,b[1])])
    elif w['to']=='U2.SCL':route(i,[(a[0],y),(1990,y),(1990,b[1])])
    else:route(i,[(a[0],y),(bx,y)])
for k,y in enumerate([1480,1590,1720]):
    i=40+5*k
    port={'G':1540,'H':1480,'J':1420}[['G','H','J'][k]]
    x=[280,240,200][k]
    route(i,[(x,port),(x,y)]);route(i+1);route(i+2,[(565,y)])
    if k==0:route(i+3,[(750,1360),(610,1360),(610,1580)])
    elif k==1:route(i+3,[(750,1340),(630,1340),(630,1690)])
    else:route(i+3,[(750,1650),(650,1650),(650,1870),(625,1870),(625,1820)])
    route(i+4)
route(55,[(750,1650),(650,1650),(650,1780)])
for k in range(10):
    i=56+k*3;route(i);route(i+1)
    xx=P[f'L{k+1}.BLACK'][0]
    route(i+2,start=(xx,395))
power(86,'TB12',[(3510,1460),(3270,1460)],tap=(3510,910))
route(95,[(2390,1420),(2390,1530),(3120,1530),(3120,1600)])
route(97,[(2190,1720),(2190,1610)])
route(99);route(100)
route(101,[(1400,1540)]);route(102,[(1510,1540)])
route(103,[(1160,1360),(1370,1360),(1370,1810),(1400,1810)])
route(104,[(1160,1360),(1370,1360),(1370,1810),(1510,1810)])
for j in range(3):
    ref=f'HSD{j+1}';i=115+j*4
    vx=P[ref+'.VIN'][0];gx=P[ref+'.LOAD_GND'][0]
    ex=P[f'C{7+j}.+'][0];cx=P[f'C{10+j}.1'][0]
    route(i,[(vx,730),(ex,730)])
    route(i+1,[(vx,730),(cx,730)])
    route(i+2,[(gx,860),(ex,860)])
    route(i+3,[(gx,860),(cx,860)])
assert set(routes)==set(by_id)

# Geometric checks protect against accidental same-line shorts and misplaced ends.
def segments(pts):return list(zip(pts,pts[1:]))
def on(p,a,b):
    return min(a[0],b[0])<=p[0]<=max(a[0],b[0]) and min(a[1],b[1])<=p[1]<=max(a[1],b[1]) and (a[0]==b[0]==p[0] or a[1]==b[1]==p[1])
def rail_on(p,ref):return any(on(p,a,b) for a,b in segments(rails[ref]))
for wid,pts in routes.items():
    w=by_id[wid]
    for key,p in [(w['from'],pts[0]),(w['to'],pts[-1])]:
        assert (rail_on(p,key.split('.')[0]) if key.endswith('.rail') else p==P[key]),(wid,key,p,P.get(key))
    assert all(40<=x<W-40 and 200<=y<2400 for x,y in pts),(wid,pts)

segs=[]
for wid,pts in routes.items():segs += [(by_id[wid]['net'],a,b,wid) for a,b in segments(pts)]
for ref,pts in rails.items():segs += [(dict(TB12='MACHINE_12V',TB5='LOGIC_5V',TB0='0V')[ref],a,b,ref) for a,b in segments(pts)]
crossings=set();shorts=[]
for i,(na,a,b,ida) in enumerate(segs):
    for nb,c,d,idb in segs[i+1:]:
        if na==nb:continue
        va=a[0]==b[0];vb=c[0]==d[0]
        if va==vb:
            same=a[0]==c[0] if va else a[1]==c[1]
            axis=1 if va else 0
            overlap=min(max(a[axis],b[axis]),max(c[axis],d[axis]))-max(min(a[axis],b[axis]),min(c[axis],d[axis]))
            if same and overlap>0:shorts.append((ida,idb,na,nb,a,b,c,d))
        else:
            v1,v2,vnet,h1,h2=(a,b,na,c,d) if va else (c,d,nb,a,b)
            p=(v1[0],h1[1])
            if on(p,v1,v2) and on(p,h1,h2):crossings.add((p[0],p[1],vnet))
assert not shorts,'Different nets overlap: '+repr(shorts[:15])

# A component body may not conceal another component's wire.
intrusions=[]
for net,a,b,wid in segs:
    for ref,(x,y,w,h) in boxes.items():
        if a[0]==b[0]:bad=x+2<a[0]<x+w-2 and min(max(a[1],b[1]),y+h-2)>max(min(a[1],b[1]),y+2)
        else:bad=y+2<a[1]<y+h-2 and min(max(a[0],b[0]),x+w-2)>max(min(a[0],b[0]),x+2)
        if bad:intrusions.append((wid,ref,a,b))
assert not intrusions,'Wire crosses a component: '+repr(intrusions[:15])

def color(net):
    if net in COLORS:return COLORS[net]
    if net.endswith('_BLUE'):return '#146bcc'
    if net.endswith('_WHITE'):return '#7a8794'
    if net in ['VALVE_COMMAND','DAC_OUT']:return '#138147'
    if net in ['VALVE_FEEDBACK','FEEDBACK_IN','POSITION_RAW','POSITION_ADC']:return '#0b829c'
    if net.startswith('FLOW'):return '#9c6812'
    return '#a1542c'
# Every wire's own continuous polyline is visible and tied to the canonical netlist.
for w in N['wires']:
    wid=w['id'];pts=routes[wid]
    group=el('g',{'data-wire-id':wid,'data-net':w['net'],'data-from':w['from'],'data-to':w['to']},wire_layer)
    line(pts,color(w['net']),2.5,group,**{'data-conductor':'true'})
    # Put each ID on a mostly unique final branch; automatic defaults can be overridden.
    if wid in wire_labels:x,y,rot=wire_labels[wid]
    else:
        a,b=pts[-2:];length=abs(a[0]-b[0])+abs(a[1]-b[1])
        if length<28 and len(pts)>2:a,b=pts[-3:-1]
        if a[0]==b[0]:x=a[0]-7;y=(a[1]+b[1])/2;rot=-90
        else:x=(a[0]+b[0])/2;y=a[1]-8;rot=None
    txt(x,y,wid,12,False,color(w['net']),label_layer,anchor='middle',halo=True,rotate=rot)
# White bridge knockouts interrupt only the horizontal crossing wire.
for x,y,net in sorted(crossings):
    line([(x,y-6),(x,y+6)],'white',10,cross_layer)
    line([(x,y-7),(x,y+7)],color(net),2.5,cross_layer)
# Find real branching junctions: at least three conductor directions of ONE net.
candidates={p for _,a,b,_ in segs for p in [a,b]}
for i,(na,a,b,_) in enumerate(segs):
    for nb,c,d,_ in segs[i+1:]:
        if na!=nb or (a[0]==b[0])==(c[0]==d[0]):continue
        p=(a[0],c[1]) if a[0]==b[0] else (c[0],a[1])
        if on(p,a,b) and on(p,c,d):candidates.add(p)
for p in candidates:
    by_net={}
    for net,a,b,_ in segs:
        if on(p,a,b):
            dirs=by_net.setdefault(net,set())
            for q in [a,b]:
                if q!=p:dirs.add(('x',1 if q[0]>p[0] else -1) if q[0]!=p[0] else ('y',1 if q[1]>p[1] else -1))
    for net,dirs in by_net.items():
        if len(dirs)>=3:
            assert not any(x==p[0] and y==p[1] for x,y,_ in crossings),('Junction at foreign-net crossing',p,net)
            el('circle',{'cx':p[0],'cy':p[1],'r':4.8,'fill':color(net),'data-junction-net':net},dot_layer)

# Notes in free space are a legend for the drawing, not separate circuit panels.
notes=el('g',id='drawing-notes')
rect(190,2020,1270,355,'#f4f7f9','none',notes,rx=10)
txt(220,2060,'CONTROL WITHOUT A FLOW METER',22,True,parent=notes)
for i,s in enumerate([
 'Valve power shares the machine supply; signal loops are direct.',
 'Normal, Set Max, Flush and all ten lamps retain their controls.',
 'An optional bucket / stopwatch calibration can map levels to flow.',
 'A stored curve estimates flow only under similar water conditions.',
 'No automatic flow sweep, live GPM or water-stop detection is provided.',
 'The internal watchdog can recover the Nano; power loss does not close the valve.',
 'Live G/H/J with main power OFF: opto inputs draw about 9 mA each at 12 V.',
 'Output-side HV = controller logic 5 V only. Bench-check the power-off case.'
]):txt(220,2105+i*31,s,18,parent=notes)
rect(1680,1990,1820,385,'#f4f7f9','none',notes,rx=10)
txt(1710,2030,'BUILD AND READING NOTES',22,True,parent=notes)
for i,s in enumerate([
 f'• All {len(N["wires"])} external wires are drawn. Shared trunks are joined terminals, not additional electronics.',
 '• Component terminal positions are arranged for readability. Use the detailed sheets for physical pinouts.',
 '• U1 GND1 = GND2; RESET headers unused; U2 GND = OUT_GND; HSD grounds are internally common.',
 '• I²C stays inside the enclosure below 100 kHz. Use only the U2 SDA/SCL pull-ups; open all HSD bus pull-up jumpers.',
 '• HSD1 address jumpers open; HSD2 A1 closed; HSD3 A2 closed. All MAX_AMP jumpers open.',
 '• HSD3 CH4–CH7 are unused and must remain OFF. Only twenty mapped channels drive lamps.',
 '• Resistors: 1%. Ceramic capacitors: X7R, 50 V. C7–C9: 47 µF, 35 V, 105 °C; observe polarity.',
 '• Unused Nano pins: 3V3, A1/A2/A3/A6/A7, AREF, RX/TX, D5/D6/D7/D8/D9/D10/D11/D12/D13.',
 '• No relay, coil regulator, flow meter or temperature probes. Codes 2 / 9 have no fitted sensors.',
 '• Plumbing: hose → shutoff / strainer → valve → sprayer. Support the plumbing and keep electrical wiring dry.'
]):txt(1710,2064+i*28,s,16,parent=notes)
txt(1710,2359,'Power loss does not spring-return the ball valve closed. Keep an accessible manual water shutoff.',17,True,RED,notes)
rect(40,2420,3520,87,NAVY,'none')
txt(63,2452,'RELEASE HOLDS',18,True,'#ffd7cc')
txt(260,2452,'H1 actual machine cavities · H2 fuse / wire sizing · H3 purchased parts · H4 valve signal returns / compliance · H5 firmware and bench qualification',17,False,'white')
txt(63,2484,f'{len(N["components"])} components · {len(N["nets"])} nets · no flow / temperature sensors · detailed circuit booklet and connection register remain companion documents',17,False,'white')
txt(3240,2484,'SHEET 1 OF 1',18,True,'white')

# Geometry record is part of the SVG and is revalidated independently in CI.
meta={'pins':P,'rails':rails,'bodies':boxes,'routes':routes,'crossing_count':len(crossings)}
el('metadata',id='wiring-geometry').text=json.dumps(meta,separators=(',',':'))
svg=OUT/'water-controller-single-page-rev-g.svg'
ET.ElementTree(root).write(svg,encoding='utf-8',xml_declaration=True)
pdf=svg.with_suffix('.pdf');png=svg.with_suffix('.png')
subprocess.run(['inkscape',str(svg),'--export-type=pdf','--export-filename='+str(pdf)],check=True,stdout=subprocess.DEVNULL)
import fitz, os
with fitz.open(pdf) as raster_doc:
    preview_bytes=raster_doc[0].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False).tobytes('png')
with png.open('wb') as preview_file:
    preview_file.write(preview_bytes); preview_file.flush(); os.fsync(preview_file.fileno())
reader=PdfReader(pdf);assert len(reader.pages)==1
page_text=reader.pages[0].extract_text()
assert sorted(re.findall(r'W\d{3}',page_text))==sorted(by_id),'Every wire ID must occur exactly once in PDF'
for ref in N['components']:assert ref in page_text,'Missing PDF component '+ref
(DATA/'single-page-manifest.json').write_text(json.dumps({'revision':'G','drawing_type':'continuous-wiring',
 'pdf_pages':1,'external_wires':len(routes),'components':len(G),'netlist_sha256':sha,
 'outputs':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [svg,pdf,png]}},indent=2)+'\n')
print(json.dumps({'pages':1,'drawing':'continuous-wiring','wires':len(routes),'components':len(G),'crossings':len(crossings),'output':str(pdf)},indent=2))
