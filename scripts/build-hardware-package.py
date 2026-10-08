#!/usr/bin/env python3
"""Generate the Rev F bench-design netlist, diagrams and printable audit.

Requires Python 3, reportlab, pypdf and Inkscape for PNG rendering.
No firmware, hardware state or external repository is modified.
"""
from pathlib import Path
import csv, hashlib, json, re, subprocess, tempfile
from html import escape
from reportlab.graphics.shapes import Drawing, Rect, Line, String, Circle, PolyLine
from reportlab.graphics import renderPDF, renderSVG
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'hardware/rev-f'
OUT = ROOT / 'docs/assets/hardware'
DATA.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
for name, file in [('DejaVu','DejaVuSans.ttf'), ('DejaVu-Bold','DejaVuSans-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name, '/usr/share/fonts/truetype/dejavu/' + file))

N = {'revision':'F','date':'2026-10-07','status':'BENCH_DESIGN_HOLD_H1_H5',
     'components':{},'nets':{},'wires':[], 'internal_connections':[], 'no_connect':[],
     'addresses':{'U2':[88],'HSD1':[96,97],'HSD2':[98,99],'HSD3':[100,101]},
     'hold_points':['H1 machine pinout','H2 fuse/conductors','H3 actual parts','H4 valve loops','H5 firmware/bench'],
     'lamp_channels':[],
     'notes':['Not flashable firmware. No physical validation performed.',
              'Every endpoint uses functional terminal names. X1 numbers are NOT machine cavities.',
              'Voltage domains are nominal classifications, not transient or miswire ratings.']}

def comp(ref, part, pins, kind='module', note=''):
    N['components'][ref]={'part':part,'pins':pins,'kind':kind,'note':note}
def conn(net, *pins, domain='signal', anchor=None, note=''):
    n=N['nets'].setdefault(net, {'domain':domain,'pins':[]})
    old=list(n['pins'])
    for p in pins:
        if p not in n['pins']: n['pins'].append(p)
    a=anchor or (old[0] if old else pins[0])
    for p in pins:
        if p != a and p not in old:
            N['wires'].append({'id':f'W{len(N["wires"])+1:03}', 'net':net,'from':a,'to':p,'note':note})
def internal(a,b):
    N['internal_connections'].append([a,b])
def nc(*pins): N['no_connect'].extend(pins)
def ground(*pins,anchor='TB0.rail',note=''):conn('0V',*pins,domain='ground',anchor=anchor,note=note)
def five(*pins,anchor='TB5.rail',note=''):conn('LOGIC_5V',*pins,domain='5V',anchor=anchor,note=note)
def r(ref,ohms,watts=.25):
    comp(ref,f'{ohms:g} ohm 1% {watts:g} W',['1','2'],'resistor')
    N['components'][ref].update(resistance_ohms=ohms,power_w=watts,tolerance_pct=1)
def c(ref,value):comp(ref,value,['+','-'] if 'electrolytic' in value else ['1','2'],'capacitor')
def diode(ref):comp(ref,'1N4148, axial',['A','K'],'diode','Band = K / cathode')

comp('X1','Reused machine harness; verify actual cavities',['1','2','3','4','5'],'connector')
for ref,part in [('TB12','12 V distribution'),('TB5','Logic 5 V distribution'),('TB0','Ground distribution')]:
    comp(ref,part,['rail'],'bus','Joined terminals; hardware and wire rating subject to H2')
comp('U1','Arduino Nano Every ABX00028',
     ['VIN','5V','3V3','GND1','GND2','A0','A1','A2','A3','A4','A5','A6','A7','AREF','RESET1','RESET2','RX','TX']+
     [f'D{i}' for i in range(2,14)])
comp('U2','DFRobot DFR1229',['VCC','GND','SDA','SCL','OUT','OUT_GND'])
comp('U3','DFRobot SEN0262',['VCC','GND','SIGNAL','I+','I-'])
for h in ['HSD1','HSD2','HSD3']:
    comp(h,'Serial Wombat PCB0046 HSD V2',['VIN','LOAD_GND','D','C','V','G']+[f'CH{i}' for i in range(8)]+[f'G{i}' for i in range(8)])
    internal(h+'.LOAD_GND',h+'.G')
    for i in range(8):internal(h+'.LOAD_GND',h+f'.G{i}')
for o in ['O1','O2']:
    comp(o,'SparkFun BOB-09118 v1.2',['IN1','IN2','INPUT_GND','HV','HV_GND','OUT1','OUT2','JP2_1'])
comp('V1','U.S. Solid USS-MSV50030',['RED','BLACK','GREEN','WHITE','YELLOW'],'actuator')
comp('FM1','ScioSense UFM-02-03NP4',['RED','BLACK','YELLOW','WHITE'],'sensor')
comp('U4','ST L7805ABV TO-220',['1','2','3','TAB'],'regulator')
internal('U4.2','U4.TAB')
comp('K1','Panasonic TQ2-5V single-side-stable',[str(i) for i in range(1,11)],'relay')
for i in range(1,11):comp(f'L{i}','Nilight TL-248BW',['BLUE','WHITE','BLACK'],'lamp')
for i in range(1,4):r(f'R{i}',1000,.5);diode(f'D{i}')
r('R4',1000);r('R5',100000)
for i in [6,7]:r(f'R{i}',4700)
for i in [8,9]:r(f'R{i}',1000)
diode('D4')
for i in [1,2,5,10,11,12]:c(f'C{i}','100 nF X7R 50 V')
c('C4','330 nF X7R 50 V')
for i in [7,8,9]:c(f'C{i}','47 uF 35 V 105 C electrolytic')

conn('MACHINE_12V','X1.1','TB12.rail','U1.VIN','HSD1.VIN','HSD2.VIN','HSD3.VIN',domain='12V',anchor='TB12.rail',note='Existing fused machine supply; H1/H2 unresolved')
ground('X1.2','TB0.rail','U1.GND1','U2.GND','U3.GND','HSD1.LOAD_GND','HSD2.LOAD_GND','HSD3.LOAD_GND',
       'O1.INPUT_GND','O1.HV_GND','O2.INPUT_GND','O2.HV_GND','V1.BLACK','V1.WHITE','U3.I-',
       'FM1.BLACK','U4.2','K1.10',note='Separate load and signal returns to distribution; V1 WHITE requires H4')
internal('U1.GND1','U1.GND2'); internal('U2.GND','U2.OUT_GND')
five('U1.5V','TB5.rail','U2.VCC','U3.VCC','HSD1.V','HSD2.V','HSD3.V','O1.HV','O2.HV','FM1.RED',note='Only Nano regulator sources this rail; measure load')
conn('SDA','U1.A4','U2.SDA','HSD1.D','HSD2.D','HSD3.D',anchor='U1.A4',note='100 kHz local bus; only DAC onboard pull-up')
conn('SCL','U1.A5','U2.SCL','HSD1.C','HSD2.C','HSD3.C',anchor='U1.A5',note='100 kHz local bus; only DAC onboard pull-up')
for i,(sig,o,inp,out,pin) in enumerate([('G','O1','IN1','OUT1','D2'),('H','O1','IN2','OUT2','D3'),('J','O2','IN1','OUT1','D4')],1):
    conn('MACHINE_'+sig,f'X1.{i+2}',f'R{i}.1',domain='12V_input')
    conn('OPTO_'+sig,f'R{i}.2',f'{o}.{inp}',f'D{i}.K',anchor=f'R{i}.2')
    ground(f'D{i}.A',anchor=o+'.INPUT_GND',note='Diode band faces IN terminal')
    conn(sig+'_LOGIC',f'{o}.{out}','U1.'+pin)
ground('O2.IN2',anchor='O2.INPUT_GND',note='Unused input held inactive')
nc('O1.JP2_1','O2.JP2_1','O2.OUT2')
for i in range(1,11):
    board=1+(i-1)//4; base=2*((i-1)%4)
    for color,ch in [('BLUE',base),('WHITE',base+1)]:
        conn(f'L{i}_{color}',f'HSD{board}.CH{ch}',f'L{i}.{color}',domain='switched_12V')
    ground(f'L{i}.BLACK',note='Rated lamp-return harness; do not route through Nano')
    N['lamp_channels'].append({'lamp':i,'board':f'HSD{board}','blue':base,'white':base+1})
conn('VALVE_12V','HSD3.CH4','V1.RED','U4.1',domain='switched_12V',note='Watchdog controlled, steady DC; not lamp PWM')
conn('RELAY_5V','U4.3','K1.1','D4.K','C5.1',domain='relay_5V',note='Separate from LOGIC_5V')
ground('D4.A',anchor='K1.10',note='Flyback diode band faces coil positive')
ground('C5.2','C4.2',anchor='U4.2',note='Local regulator bypass return')
conn('VALVE_12V','C4.1',anchor='U4.1',domain='switched_12V',note='330 nF close to regulator IN')
conn('DAC_OUT','U2.OUT','K1.3',domain='current_loop',note='Potential about 15 V; never ADC')
conn('VALVE_COMMAND','K1.4','V1.GREEN',domain='current_loop')
conn('VALVE_FEEDBACK','V1.YELLOW','K1.7',domain='current_loop')
conn('FEEDBACK_IN','K1.8','U3.I+',domain='current_loop')
nc('K1.2','K1.9','K1.5','K1.6','HSD3.CH5','HSD3.CH6','HSD3.CH7')
conn('POSITION_RAW','U3.SIGNAL','R4.1',domain='analog_3V')
conn('POSITION_ADC','R4.2','U1.A0','R5.1','C1.1',domain='analog_3V',anchor='U1.A0')
ground('R5.2','C1.2',anchor='U1.GND1',note='Local ADC return; no load current')
for color,rp,rs,pin,net in [('YELLOW','R6','R8','D8','FLOW'),('WHITE','R7','R9','D9','FLOW_ERROR')]:
    five(rp+'.1',anchor='FM1.RED')
    conn(net+'_RAW','FM1.'+color,rp+'.2',rs+'.1',anchor='FM1.'+color)
    conn(net+'_LOGIC',rs+'.2','U1.'+pin)
five('C2.1',anchor='FM1.RED',note='Near protected meter termination')
ground('C2.2',anchor='FM1.BLACK')
for h,ce,cc in [('HSD1','C7','C10'),('HSD2','C8','C11'),('HSD3','C9','C12')]:
    conn('MACHINE_12V',ce+'.+',cc+'.1',domain='12V',anchor=h+'.VIN',note='Local load-supply bypass; electrolytic + to VIN')
    ground(ce+'.-',cc+'.2',anchor=h+'.LOAD_GND')
nc(*['U1.'+p for p in ['3V3','A1','A2','A3','A6','A7','AREF','RESET1','RESET2','RX','TX','D5','D6','D7','D10','D11','D12','D13']])
N['relay']={'coil':['K1.1','K1.10'],'normally_open':[['K1.3','K1.4'],['K1.8','K1.7']],
            'normally_closed':[['K1.3','K1.2'],['K1.8','K1.9']], 'view':'manufacturer bottom view'}
N['watchdog']={'board':'HSD3','address':100,'channel':4,'timeout_ms_proposed':500,'feed_ms_proposed':100,
                'default':'HIGH','timeout':'LOW','return_delay':65535,'qualified':False}
N['pullups']={'SDA':{'ohms':4700,'onboard':'U2'},'SCL':{'ohms':4700,'onboard':'U2'},
              'FLOW_RAW':'R6','FLOW_ERROR_RAW':'R7'}
N['jumper_configuration']={h:{'A1':h=='HSD2','A2':h=='HSD3','A3':False,'SJSDA':False,'SJSCL':False,'MAX_AMP':False} for h in ['HSD1','HSD2','HSD3']}
# Revision F removes the optional metering branch before any export.
# Keep surviving W-numbers stable so existing harness labels remain meaningful.
removed = {'FM1','R6','R7','R8','R9','C2'}
retained = lambda pin: pin.split('.')[0] not in removed and pin not in {'U1.D8','U1.D9'}
N['components'] = {ref:c for ref,c in N['components'].items() if ref not in removed}
N['wires'] = [w for w in N['wires'] if retained(w['from']) and retained(w['to'])]
for name in list(N['nets']):
    N['nets'][name]['pins'] = [pin for pin in N['nets'][name]['pins'] if retained(pin)]
    if not N['nets'][name]['pins']: del N['nets'][name]
N['no_connect'] += ['U1.D8','U1.D9']
N['pullups'].pop('FLOW_RAW'); N['pullups'].pop('FLOW_ERROR_RAW')
N['notes'] += ['Revision F: no flow meter or external temperature sensors. D7/D8/D9 unused.',
               'Valve position feedback remains required. No automatic flow acquisition or water-stop detection.']
# Revision F: shared valve power, direct signal loops, solid-state host reset.
removed_f = {'K1','U4','D4','C4','C5'}
N['components'] = {ref:c for ref,c in N['components'].items() if ref not in removed_f}
N['wires'] = [w for w in N['wires'] if w['id'] not in {'W096','W098'} and
              (w['id'] in {'W095','W097'} or all(p.split('.')[0] not in removed_f for p in [w['from'],w['to']]))]
for w in N['wires']:
    if w['id']=='W086': w.update(net='MACHINE_12V', **{'from':'TB12.rail','to':'V1.RED'}, note='Shared machine supply; no independent actuator power disconnect')
    if w['id']=='W095': w.update(net='VALVE_COMMAND', to='V1.GREEN', note='Direct command; disconnect valve during USB-only service')
    if w['id']=='W097': w.update(net='VALVE_FEEDBACK', to='U3.I+', note='Direct valve-reported position feedback')
N['internal_connections']=[pair for pair in N['internal_connections'] if all(p.split('.')[0] not in removed_f for p in pair)]
internal('U1.RESET1','U1.RESET2')
N['no_connect']=[p for p in N['no_connect'] if p.split('.')[0] not in removed_f and p not in {'U1.RESET1','U1.RESET2'}]
comp('Q1','onsemi 2N3904BU TO-92',['1','2','3'],'transistor','1 emitter, 2 base, 3 collector; verify selected onsemi package drawing')
r('R11',4700); N['components']['R11']['tolerance_pct']=5; N['components']['R11']['part']='4700 ohm 5% 0.25 W'
r('R12',1000,.5)
extra=[('WATCHDOG_12V','HSD3.CH4','R11.1','switched_12V'),
       ('RESET_BASE','R11.2','Q1.2','transistor_base'),
       ('RESET_BASE','Q1.2','R12.1','transistor_base'),
       ('0V','TB0.rail','Q1.1','ground'),('0V','Q1.1','R12.2','ground'),
       ('RESET_N','Q1.3','U1.RESET1','logic_reset')]
domains={k:v['domain'] for k,v in N['nets'].items()}
for i,(net,a,b,domain) in enumerate(extra,127):
    N['wires'].append({'id':f'W{i:03}','net':net,'from':a,'to':b,'note':'Host reset only; never connect 12 V directly to RESET'})
    domains[net]=domain
N['nets']={}
for w in N['wires']:
    n=N['nets'].setdefault(w['net'],{'domain':domains[w['net']],'pins':[]})
    for pin in [w['from'],w['to']]:
        if pin not in n['pins']: n['pins'].append(pin)
N.pop('relay')
N['watchdog']={'board':'HSD3','address':100,'channel':4,'purpose':'host_reset_only',
    'timeout_ms_proposed':2000,'feed_ms_proposed':100,'default':'LOW','timeout':'HIGH',
    'return_delay':100,'reset_wombat':False,'qualified':False,
    'mcu_timeout_ms_proposed':1024,'one_shot_until_rearmed':True}
N['notes'] += ['Revision F: K1/U4/D4/C4/C5 removed. Valve uses shared machine power and direct command/feedback.',
 'Wombat CH4 drives Q1 through R11; R12 holds the base low. It resets the host; it does not disconnect or close the valve.',
 'Code 2 overcurrent detection is unavailable for the directly supplied valve. Code 9 temperature remains reserved.',
 'Retained wire IDs unchanged except W086/W095/W097; new reset wiring W127-W132.']
(DATA/'netlist.json').write_text(json.dumps(N,indent=2)+'\n')
with (DATA/'connections.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=['id','net','from','to','note']);w.writeheader();w.writerows(N['wires'])
with (DATA/'bom.csv').open('w',newline='') as f:
    w=csv.writer(f);w.writerow(['Reference','Specification','Note'])
    for ref,v in N['components'].items():w.writerow([ref,v['part'],v['note']])

# Vector drawing helpers. Coordinates use a top-left origin for readability.
NAVY='#173047'; BLUE='#1675ba'; RED='#bd382f'; GREEN='#087853'; AMBER='#a95b0c'; GRAY='#485965'; PALE='#edf2f5'
def color(v):
    # ReportLab does not expand CSS shorthand (#fff) by itself.
    if len(v)==4 and v.startswith('#'):v='#'+''.join(c*2 for c in v[1:])
    return colors.HexColor(v)
class Sheet:
    def __init__(self,title,subtitle):
        self.w=1120;self.h=760;self.d=Drawing(self.w,self.h);self.ends=[]
        self.rect(0,0,self.w,self.h,'#ffffff')
        self.rect(0,0,self.w,74,NAVY)
        self.text(28,31,title,20,'#ffffff',True)
        self.text(28,56,subtitle,11,'#d7e5ef')
        self.text(28,735,'REV F  |  07 OCT 2026  |  BENCH DESIGN - H1-H5 HOLD  |  Named nets connect across sheets',10,RED,True)
        self.text(28,751,'Solid dot = joined wires. Crossing without a dot = no connection. Boxes show functions, not physical footprints.',8,GRAY)
    def text(self,x,y,s,size=11,col=NAVY,bold=False):
        self.d.add(String(x,self.h-y,s,fontName='DejaVu-Bold' if bold else 'DejaVu',fontSize=size,fillColor=color(col)))
    def rect(self,x,y,w,h,fill='#fff',stroke=None):
        self.d.add(Rect(x,self.h-y-h,w,h,fillColor=color(fill),strokeColor=color(stroke) if stroke else None,strokeWidth=1))
    def line(self,*pts,col=GRAY,width=1.5):
        # SVG defaults open polylines to a black fill if its exporter omits
        # fill="none". Individual line segments cannot create a filled polygon.
        for (x1,y1),(x2,y2) in zip(pts,pts[1:]):
            self.d.add(Line(x1,self.h-y1,x2,self.h-y2,strokeColor=color(col),strokeWidth=width))
    def dot(self,x,y,col=GRAY):self.d.add(Circle(x,self.h-y,3,fillColor=color(col),strokeColor=None))
    def box(self,x,y,w,h,title,sub=''):
        self.rect(x,y,w,h,PALE,'#9cabb5');self.text(x+12,y+23,title,12,NAVY,True)
        if sub:self.text(x+12,y+41,sub,9,GRAY)
    def endpoint(self,x,y,pin,side='right',label=None,dy=4):
        self.d.add(Circle(x,self.h-y,3.2,strokeColor=color(NAVY),fillColor=colors.white))
        self.ends.append(pin)
        if side=='right':self.text(x+8,y+dy,label or pin,10)
        else:
            t=label or pin;self.text(x-8-pdfmetrics.stringWidth(t,'DejaVu',10),y-7,t,10)
    def tagged(self,x,y,pin,net,side='left',col=GREEN):
        if side=='left':
            self.line((x-115,y),(x,y),col=col);self.text(x-115,y-7,net,9,col,True);self.endpoint(x,y,pin,'right')
        else:
            self.line((x,y),(x+115,y),col=col);self.text(x+12,y-7,net,9,col,True);self.endpoint(x,y,pin,'left')
    def resistor(self,x,y,ref,value,vertical=False):
        if vertical:
            self.line((x,y),(x,y+10));self.rect(x-6,y+10,12,30,'#fff',GRAY);self.line((x,y+40),(x,y+50))
            self.text(x+12,y+21,ref,10,NAVY,True);self.text(x+12,y+36,value,9)
        else:
            self.line((x,y),(x+10,y));self.rect(x+10,y-6,40,12,'#fff',GRAY);self.line((x+50,y),(x+60,y))
            self.text(x+8,y-15,ref+' '+value,9,NAVY,True)
    def note(self,x,y,lines,size=10,col=GRAY):
        for i,t in enumerate(lines):self.text(x,y+i*(size+5),t,size,col)
    def save(self,name):
        renderSVG.drawToFile(self.d,str(OUT/(name+'.svg')))
        return self

sheets=[]

s=Sheet('01 / POWER AND LOCAL BUS','Supply domains, module grounds, I2C addresses and Nano connections')
s.box(145,105,200,145,'X1 / reused connector','INTERNAL terminal labels only')
for y,p,n,cx in [(165,'X1.1','MACHINE_12V',RED),(200,'X1.2','0V',GRAY)]:s.tagged(345,y,p,n,'right',cx)
s.note(155,278,['X1.3 = G; X1.4 = H; X1.5 = J.','Actual machine cavities: H1 HOLD.','No additional fuse block; H2 HOLD.'])
s.box(145,355,200,275,'U1 / Nano Every','Only VIN accepts machine voltage')
for y,p,n,co in [(420,'U1.VIN','MACHINE_12V',RED),(458,'U1.GND1','0V',GRAY),(496,'U1.5V','LOGIC_5V',AMBER),(538,'U1.A4','SDA',GREEN),(576,'U1.A5','SCL',BLUE)]:s.tagged(345,y,p,n,'right',co)
s.box(620,105,345,300,'PARALLEL SUPPLY CONNECTIONS')
s.note(638,155,['MACHINE_12V -> TB12 -> U1 VIN + HSD1/2/3 VIN','0V -> TB0 -> all power/signal returns','LOGIC_5V -> TB5 -> U2 VCC, U3 VCC, HSD V,','O1/O2 HV (no flow meter)' ,'','HSD load GND also grounds its logic internally.','Do not carry lamp current through a logic header.','U2 OUT_GND = U2 GND internally.','U1 GND2 = U1 GND1 internally.','V1 RED also uses MACHINE_12V; no relay supply.'],10)
s.box(620,435,345,195,'LOCAL I2C - 100 kHz')
s.note(638,485,['SDA: U1 A4 -> U2 SDA + HSD1/2/3 D','SCL: U1 A5 -> U2 SCL + HSD1/2/3 C','U2: 0x58; HSD pairs: 0x60/61, 0x62/63, 0x64/65','Use U2 onboard 4.7k pull-ups only.','Open all HSD SDA/SCL pull-up jumpers.','All bus wiring remains inside enclosure.'],10)
s.note(145,672,['Local HSD bypass at each VIN/GND: 47 uF / 35 V (+ to VIN) in parallel with 100 nF / 50 V.','USB can energize the logic rail. Disconnect machine, valve and water before USB servicing.'],11,RED)
sheets.append(s.save('rev-f-01-power'))

s=Sheet('02 / G, H AND J INPUTS','SparkFun BOB-09118 v1.2: HV terminal receives 5 V, not machine voltage')
for row,(sig,o,inp,out,dig,idx) in enumerate([('G','O1','IN1','OUT1','D2',1),('H','O1','IN2','OUT2','D3',2),('J','O2','IN1','OUT1','D4',3)]):
    y=175+155*row
    s.text(30,y-38,f'{sig} / X1.{idx+2}',13,NAVY,True)
    s.line((35,y),(135,y),col=RED);s.text(35,y-9,'Machine signal',9,RED)
    s.resistor(135,y,f'R{idx}','1k / 0.5 W')
    s.line((195,y),(350,y),col=GREEN);s.dot(265,y)
    s.box(350,y-40,380,92,f'{o} channel {inp[-1]}')
    s.text(363,y+30,'Internal 220-ohm resistor + optocoupler + inverter',9,GRAY)
    s.endpoint(350,y,o+'.'+inp,'right');s.endpoint(730,y,o+'.'+out,'left')
    s.line((730,y),(1000,y),col=GREEN);s.endpoint(1000,y,'U1.'+dig,'left')
    s.line((265,y),(265,y+54));s.rect(214,y+54,102,26,'#fff',GRAY)
    s.text(221,y+71,f'D{idx} 1N4148',9);s.text(322,y+68,'K/band to IN',9)
    s.line((265,y+80),(265,y+99));s.text(228,y+117,'A to 0V',9)
s.note(35,660,['O1/O2 HV -> LOGIC_5V; HV-GND and INPUT_GND -> 0V. O2 IN2 -> INPUT_GND.','O2 OUT2 and both JP2 pin 1 pads unused. HIGH machine input -> HIGH Arduino input.','The three diodes are across the input LED circuits, after the external series resistors.'],11)
sheets.append(s.save('rev-f-02-inputs'))

s=Sheet('03 / DIRECT VALVE AND SOLID-STATE WATCHDOG','Shared supply; independent watchdog resets the Arduino, not the valve power')
s.box(790,110,290,330,'V1 / USS-MSV50030','One five-wire actuator cable')
for y,p,n,co in [(177,'V1.RED','MACHINE_12V',RED),(223,'V1.BLACK','0V',GRAY),(267,'V1.WHITE','0V / SIGNAL COMMON',GRAY),(325,'V1.GREEN','U2 OUT / 4-20 mA',GREEN),(382,'V1.YELLOW','U3 I+ / FEEDBACK',BLUE)]: s.tagged(790,y,p,n,'left',co)
s.box(35,110,360,180,'U2 / DFR1229','VCC 5 V; GND 0V; SDA A4; SCL A5')
s.note(55,168,['OUT -> valve GREEN directly.','OUT_GND = GND -> WHITE / 0V.','Initialize to 4 mA CLOSED before controls.','0 mA is NOT the documented closed command.'],11)
s.box(35,335,360,130,'U3 / SEN0262','VCC 5 V; GND 0V; SIGNAL -> R4 / A0')
s.note(55,390,['I+ -> valve YELLOW directly.','I- -> WHITE / 0V. No added shunt.'],11)
s.text(35,525,'HSD3 CH4',12,NAVY,True);s.line((35,545),(220,545),col=RED);s.resistor(220,545,'R11','4.7k / 5%')
s.line((280,545),(475,545),col=GREEN);s.dot(360,545)
s.box(475,493,190,129,'Q1 / 2N3904BU','1 E / 2 B / 3 C')
s.endpoint(475,545,'Q1.2 / B','left');s.tagged(570,493,'Q1.3 / C','U1 RESET','right',BLUE)
s.tagged(665,590,'Q1.1 / E','0V','right',GRAY)
s.line((360,545),(360,574));s.resistor(360,574,'R12','1k / 0.5 W',True);s.line((360,624),(360,648));s.text(344,668,'0V',10)
s.note(710,495,['CH4 LOW normally; HIGH on timeout.','Q1 pulls RESET low; never apply 12 V to RESET.','Proposed: 2 s timeout, 100 ms reset pulse.','Return LOW; no automatic repeating pulse.','Reinitialize the watchdog after every reset.'],10)
s.note(35,701,['No independent valve-power cut or actuator-current measurement. Reset does not guarantee closure.','Disconnect valve and machine before USB-only service. Verify power sequencing on the bench.'],11,RED)
sheets.append(s.save('rev-f-03-valve'))

s=Sheet('04 / ANALOG POSITION FEEDBACK','No 12 V connection anywhere on this sheet; U2 current-loop output is not an ADC signal')
s.box(150,117,220,205,'U3 / SEN0262','4-20 mA -> 0.48-2.40 V')
for yy,p,n,co in [(188,'U3.I+','VALVE_FEEDBACK',GREEN),(224,'U3.I-','0V / WHITE',GRAY),(263,'U3.VCC','LOGIC_5V',AMBER),(300,'U3.GND','0V',GRAY)]:s.tagged(150,yy,p,n,'left',co)
s.line((370,195),(490,195),col=GREEN);s.endpoint(370,195,'U3.SIGNAL','left');s.resistor(490,195,'R4','1k')
s.line((550,195),(975,195),col=GREEN);s.endpoint(975,195,'U1.A0','left');s.text(722,181,'POSITION_ADC',10,GREEN,True)
s.dot(615,195);s.line((615,195),(615,235));s.resistor(615,235,'R5','100k',True);s.line((615,285),(615,320));s.text(603,338,'0V',10)
s.dot(808,195);s.line((808,195),(808,256));s.line((792,256),(824,256),width=2);s.line((792,264),(824,264),width=2);s.line((808,264),(808,320));s.text(825,259,'C1 100 nF',10);s.text(796,338,'0V',10)
s.note(150,363,['R5 biases an open SIGNAL wire low. R4/R5 reduce the measured voltage by about 1%; calibrate.','No extra 250-ohm resistor across U3 I+/I-. C1 and R5 return locally to the Nano ground.'],10)
s.note(150,465,['Revision F omits the flow meter and its entire interface.','Nano D8 and D9 are unused; R6-R9 and C2 are not installed.','','Valve position feedback remains required for normal control and recovery.','An indicated closed position is not an independent measurement of stopped water.','','Optional manual calibration: collect all nozzle output at known valve positions.','Store a validated monotone flow/position table; there is no automatic meter sweep.'],12)
sheets.append(s.save('rev-f-04-feedback'))

s=Sheet('05 / LAMP OUTPUTS AND BOARD CONFIGURATION','Use the printed channel numbers. Each blue/white lamp needs TWO separate switched positives.')
for h,x,ls,count,ad in [('HSD1',35,1,4,'0x60/61'),('HSD2',400,5,4,'0x62/63'),('HSD3',765,9,2,'0x64/65')]:
    s.box(x,115,320,443,h+' / PCB0046 V2',ad+'  |  LOAD VIN 12 V; VDD 5 V')
    for k in range(8):
        yy=195+k*42
        target=(f'L{ls+k//2} '+('BLUE +' if k%2==0 else 'WHITE +')) if k<2*count else ('HOST RESET / WATCHDOG' if h=='HSD3' and k==4 else 'UNUSED / OFF')
        s.text(x+13,yy-6,f'CH{k}',10,NAVY,True);s.line((x+56,yy-10),(x+112,yy-10),col=BLUE if k%2==0 else GRAY)
        s.text(x+121,yy-6,target,9,GREEN if target.startswith('HOST') else NAVY)
    s.note(x+12,591,['VIN -> MACHINE_12V; LOAD GND -> 0V','D -> SDA; C -> SCL; V -> LOGIC_5V','All lamp BLACK leads -> rated 0V return'],9)
s.note(35,667,['All HSD SDA/SCL pull-up jumpers OPEN. Address: HSD1 all open; HSD2 A1 closed; HSD3 A2 closed.','V2 component-side: printed ch7 at top, ch0 at bottom; schematic OUT1 = ch7, OUT8 = ch0.','Top supply: VIN left / G right. Bottom supply: G left / VIN right. Verify markings before power.'],11,RED)
sheets.append(s.save('rev-f-05-lamps'))

s=Sheet('06 / TERMINAL ORIENTATION AND ASSEMBLY NOTES','Physical pin references apply ONLY to the stated package and revision')
s.box(35,115,500,320,'LOW-VOLTAGE CONNECTIONS')
s.note(55,165,['Nano D7, D8 and D9 are unused; leave unconnected.','No external temperature probes or flow meter.','','Retain valve feedback through U3 to Nano A0.','Position feedback does not measure actual water flow.','','C1: at A0 / logic return.','Q1 / R11 / R12: solid-state host reset.','C7-C12: local HSD load-supply bypass.','Removed: FM1, R6-R10, C2, C3, C6, TS1, TS2.','Removed reference numbers are not reused.'],11)
s.box(575,115,510,320,'POWER AND DIAGNOSTICS')
s.note(595,165,['Valve and electronics share MACHINE_12V.','No relay or separate coil regulator.','All load returns go to rated ground distribution.','Keep lamp current out of the Nano/ADC return.','','Driver thermal protection remains built in.','Generic driver FAULT does not measure ambient heat.','THER is a control input, not a temperature output.','Codes 2 and 9: no corresponding hardware sensors.','','X1 labels are NOT verified machine pin cavities.'],11)
s.box(35,482,500,195,'Q1 / onsemi 2N3904BU TO-92')
s.note(55,531,['Use the exact manufacturer package drawing.','Pin 1 = emitter / 0V; pin 2 = base / R11-R12 node.','Pin 3 = collector / Nano RESET.','Do not substitute a transistor by shape alone.','No added reset pull-up: Nano has 100k to 5 V.'],11)
s.box(575,482,510,195,'WATCHDOG CONFIGURATION')
s.note(595,530,['HSD3 CH4 is reserved; exclude it from lamp writes.','Normal LOW; timeout HIGH; return LOW after 100 ms.','Do NOT use 0xFFFF / permanent HIGH: reset would lock.','Verify both configuration packets and actual SW8B image.','Nano internal watchdog: proposed 1.024 s.','External pulse: proposed 2 s timeout; healthy feed 100 ms.'],10)
sheets.append(s.save('rev-f-06-terminals'))

# Large overview, intended for identification and navigation, not a footprint guide.
ov=Sheet('ROCK-SAW WATER CONTROL / REVISED ELECTRICAL OVERVIEW','Detailed terminal circuits: sheets 01-06. Every external wire is listed in connections.csv.')
ov.box(35,105,240,130,'Reused machine connector','12 V + wired return + G/H/J')
ov.box(385,105,260,130,'Arduino Nano Every','VIN -> 5 V logic; controls + sensing')
ov.box(775,105,305,130,'Three PCB0046 HSD boards','20 lamp channels + host watchdog')
ov.box(35,325,240,165,'Two BOB-09118 input boards','3 x 1k resistors + reverse diodes')
ov.box(385,325,260,165,'DFR1229 + SEN0262','Command current / position feedback')
ov.box(775,325,305,165,'Q1 + R11/R12 / host reset','No relay; valve uses shared supply')
ov.box(775,595,305,90,'V1 / stainless ball valve','One five-wire actuator cable')
ov.line((275,145),(385,145),col=RED);ov.text(283,135,'12 V / 0V',10,RED)
ov.line((645,145),(775,145),col=GREEN);ov.text(652,135,'5 V / I2C / 0V',9,GREEN)
ov.line((150,235),(150,325),col=RED);ov.text(164,289,'G/H/J',10,RED)
ov.line((275,374),(335,374),(335,210),(385,210),col=GREEN);ov.text(285,344,'D2/3/4',9,GREEN)
ov.line((515,235),(515,325),col=GREEN);ov.text(531,274,'I2C / A0',10,GREEN);ov.text(531,294,'5 V / 0V',10,AMBER)
ov.line((930,235),(930,325),col=RED);ov.text(945,281,'HSD3 ch4',10,RED)
ov.line((775,370),(705,370),(705,205),(645,205),col=GREEN);ov.text(670,285,'RESET',10,GREEN)
ov.line((515,490),(515,640),(775,640),col=GREEN);ov.text(540,628,'4-20 mA + signal common',10,GREEN)
ov.line((35,185),(15,185),(15,565),(830,565),(830,595),col=RED);ov.text(120,551,'Shared MACHINE_12V + wired return directly to valve',10,RED)
ov.note(35,625,['Plumbing: manual shutoff -> strainer ->','valve -> saw sprayer. No flow meter.','No electrical wires to hose or valve body.'],11)
ov.note(35,715,['OVERVIEW ONLY: grouped links represent multiple conductors. Use the detailed circuit sheets to assemble.'],10,RED)
ov.save('water-controller-wiring-flow')

# Printable vector circuit pages.
tmp=Path(tempfile.mkdtemp(prefix='water-pdf-'))
cp=tmp/'circuits.pdf';cv=canvas.Canvas(str(cp),pagesize=landscape(A4))
pw,ph=landscape(A4)
for sh in [ov]+sheets:
    cv.saveState();scale=min(pw/sh.w,ph/sh.h);cv.translate((pw-sh.w*scale)/2,(ph-sh.h*scale)/2);cv.scale(scale,scale)
    renderPDF.draw(sh.d,cv,0,0);cv.restoreState();cv.showPage()
cv.save()

# Convert authored Markdown into formal flowing text, keeping tables intact.
styles={
 'body':ParagraphStyle('body',fontName='DejaVu',fontSize=9,leading=13,spaceAfter=7),
 'h1':ParagraphStyle('h1',fontName='DejaVu-Bold',fontSize=19,leading=23,spaceAfter=14),
 'h2':ParagraphStyle('h2',fontName='DejaVu-Bold',fontSize=13,leading=17,spaceBefore=14,spaceAfter=8,keepWithNext=True),
 'h3':ParagraphStyle('h3',fontName='DejaVu-Bold',fontSize=10.5,leading=15,spaceBefore=11,spaceAfter=6,keepWithNext=True),
 'table':ParagraphStyle('table',fontName='DejaVu',fontSize=7.3,leading=10),
 'thead':ParagraphStyle('thead',fontName='DejaVu-Bold',fontSize=7.5,leading=10,textColor=colors.white)
}
pdfmetrics.registerFontFamily('DejaVu',normal='DejaVu',bold='DejaVu-Bold',italic='DejaVu',boldItalic='DejaVu-Bold')
def inline(t):
    t=escape(t)
    t=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',lambda m: f'<link href="{m[2] if m[2].startswith("http") else "https://github.com/aeae1/Rock-Saw-Water-Control/blob/main/docs/"+m[2]}" color="#1675ba">{m[1]}</link>',t)
    t=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',t)
    t=re.sub(r'`([^`]+)`',r'\1',t)
    return t
def para(t,kind='body'):return Paragraph(inline(t),styles[kind])
def table(rows,widths=None):
    cols=len(rows[0]);ws=widths or ([92,160,255] if cols==3 else [94,413] if cols==2 else [507/cols]*cols)
    data=[[Paragraph(inline(x),styles['thead' if i==0 else 'table']) for x in row] for i,row in enumerate(rows)]
    t=Table(data,colWidths=ws,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),color(NAVY)),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,color(PALE)]),('LINEBELOW',(0,0),(-1,0),.7,color(NAVY))]))
    return t
def footer(canv,doc):
    canv.setFont('DejaVu',8);canv.setFillColor(color(RED));canv.drawString(44,25,'REV F  |  BENCH DESIGN - RELEASE HOLDS H1-H5')
    canv.setFillColor(color(GRAY));canv.drawRightString(A4[0]-44,25,f'Audit / {doc.page}')
story=[];lines=(ROOT/'docs/hardware-audit-rev-f.md').read_text().splitlines();i=0
while i<len(lines):
    line=lines[i].strip();i+=1
    if not line:continue
    if line.startswith('|'):
        rows=[]
        while True:
            if not re.match(r'^\|[ :|-]+\|$',line):rows.append([x.strip() for x in line.strip('|').split('|')])
            if i>=len(lines) or not lines[i].strip().startswith('|'):break
            line=lines[i].strip();i+=1
        story.append(table(rows));story.append(Spacer(1,8))
    elif line.startswith('### '):story.append(para(line[4:],'h3'))
    elif line.startswith('## '):
        if line=='## Source register':story.append(PageBreak())
        story.append(para(line[3:],'h2'))
    elif line.startswith('# '):story.append(para(line[2:],'h1'))
    else:story.append(para(line))
story.append(PageBreak());story.append(para('Complete external connection schedule','h1'))
story.append(para('Every row is a conductor or local soldered connection. Repeated distribution terminals denote joined bus terminals, not a bundle forced into one screw. Module-internal common connections are listed separately. Wire gauges and protection remain H2.'))
rows=[['Wire','Net','From','To']]+[[w['id'],w['net'],w['from'],w['to']] for w in N['wires']]
story.append(table(rows,[40,173,147,147]))
story.append(Spacer(1,12));story.append(para('Internal connections - no added wire','h2'))
story.append(para('; '.join(a+' = '+b for a,b in N['internal_connections'])))
story.append(para('Unused external terminals','h2'));story.append(para('; '.join(N['no_connect'])))
story.append(PageBreak());story.append(para('Complete parts schedule','h1'))
story.append(para('Values specify the proposed circuit. Distribution hardware, cable sizes, sealed connectors and enclosure remain subject to physical hold points. Test instruments and the removable DAC test resistor are not installed circuit components.'))
story.append(table([['Ref','Specification','Note']]+[[ref,v['part'],v['note']] for ref,v in N['components'].items()],[52,257,198]))
tp=tmp/'audit.pdf';SimpleDocTemplate(str(tp),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=42,bottomMargin=45,title='Water Controller - Rev F Electrical Audit',author='Rock Saw Water Control project').build(story,onFirstPage=footer,onLaterPages=footer)
writer=PdfWriter()
text_reader=PdfReader(str(tp))
# Put the actual release decision before any circuit drawing.
writer.append(text_reader,pages=(0,1))
writer.append(str(cp))
writer.append(text_reader,pages=(1,len(text_reader.pages)))
writer.add_outline_item('Read first: release status and required evidence',0)
writer.add_outline_item('Electrical overview',1)
for i,label in enumerate(['Power and I2C','G/H/J inputs','Direct valve and host watchdog','Valve position feedback','Lamp channels','Terminal orientation and assembly notes'],2):
    writer.add_outline_item(label,i)
for i,page in enumerate(writer.pages):
    txt=page.extract_text() or ''
    for phrase in ['Complete external connection schedule','Complete parts schedule','Source register']:
        if txt.startswith(phrase):writer.add_outline_item(phrase,i)
writer.add_metadata({'/Title':'Rock Saw Water Control - Revision F electrical audit and schematic','/Subject':'Bench design; hardware release on hold H1-H5','/Author':'Rock Saw Water Control project'})
with (OUT/'water-controller-audit-rev-f.pdf').open('wb') as f:writer.write(f)
subprocess.run(['inkscape',str(OUT/'water-controller-wiring-flow.svg'),'--export-type=png','--export-width=2800','--export-filename='+str(OUT/'water-controller-wiring-flow.png')],check=True,stdout=subprocess.DEVNULL)
manifest={'revision':'F','wires':len(N['wires']),'components':len(N['components']),'nets':len(N['nets']),
          'pdf_pages':len(writer.pages),'source_sha256':hashlib.sha256((ROOT/'docs/hardware-audit-rev-f.md').read_bytes()).hexdigest()}
(DATA/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
