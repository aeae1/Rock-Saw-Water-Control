#!/usr/bin/env python3
"""Compose all Rev D circuits and the full connection register on one A0 sheet.

Uses the existing vector circuit sheets and netlist; does not change topology.
Requires Inkscape, pypdf and ReportLab (font-width/layout validation only).
"""
from pathlib import Path
import copy, hashlib, json, math, re, subprocess
import xml.etree.ElementTree as ET
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/assets/hardware'
DATA = ROOT / 'hardware/rev-d'
N = json.loads((DATA/'netlist.json').read_text())
SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)
W, H = 3370, 2384  # A0 landscape, points; export is one vector PDF page.
NAVY, GRAY, PALE, RED = '#173047', '#485965', '#edf2f5', '#bd382f'
FONTDIR = Path('/usr/share/fonts/truetype/dejavu')
for name, file in [('Regular','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONTDIR/file)))
root = ET.Element(f'{{{SVG}}}svg', {
    'width': f'{W}pt', 'height': f'{H}pt', 'viewBox': f'0 0 {W} {H}',
    'data-netlist-sha256': hashlib.sha256((DATA/'netlist.json').read_bytes()).hexdigest(),
    'data-sheet-count': '1', 'role': 'img', 'aria-labelledby': 'title desc'})
ET.SubElement(root, f'{{{SVG}}}title', {'id':'title'}).text = 'Rock Saw Water Control — complete single-page Revision D schematic'
ET.SubElement(root, f'{{{SVG}}}desc', {'id':'desc'}).text = 'Six circuit sections, every external connection, every component, internal common connections and unused terminals. Bench design with release holds H1–H5.'

def rect(x,y,w,h,fill=PALE,stroke=None,parent=root):
    a={'x':str(x),'y':str(y),'width':str(w),'height':str(h),'fill':fill}
    if stroke:a.update(stroke=stroke, **{'stroke-width':'0.7'})
    return ET.SubElement(parent,f'{{{SVG}}}rect',a)

def text(x,y,s,size=12,bold=False,color=NAVY,parent=root,max_width=None):
    width=pdfmetrics.stringWidth(s,'Bold' if bold else 'Regular',size)
    assert x>=0 and y-size>=0 and x+width<=W-12 and y<=H-10, ('Text outside page',s)
    if max_width is not None:assert width<=max_width, ('Text exceeds cell',s,width,max_width)
    a={'x':str(x),'y':str(y),'font-family':'DejaVu Sans','font-size':str(size),'fill':color}
    if bold:a['font-weight']='bold'
    ET.SubElement(parent,f'{{{SVG}}}text',a).text=s

def wrapped(x,y,s,width,size=10,line=15):
    words=s.split();buf=''
    for word in words:
        trial=(buf+' '+word).strip()
        if pdfmetrics.stringWidth(trial,'Regular',size)>width:
            text(x,y,buf,size);y+=line;buf=word
        else:buf=trial
    if buf:text(x,y,buf,size);y+=line
    return y

rect(0,0,W,H,'white')
rect(0,0,W,92,NAVY)
text(26,35,'ROCK-SAW WATER CONTROL  /  COMPLETE SINGLE-PAGE SCHEMATIC',27,True,'white')
text(26,62,'Revision D • compiled 7 October 2026 • A0 landscape • six circuit sections + all 126 external connections',15,False,'#d7e5ef')
text(2250,35,'BENCH DESIGN — RELEASE HOLDS H1–H5',20,True,'#ffd2c8')
text(2250,62,'Functional terminal labels; X1 numbers are NOT machine connector cavities.',12,False,'white')

# Embed the original authored vector circuits. Prefix all IDs so clip paths
# cannot accidentally select another panel. Remove only their repeated footer.
sources=[]
margin,gap=24,16
tile_w=(W-2*margin-2*gap)/3
scale=tile_w/1120
tile_h=760*scale
for i,path in enumerate(sorted(OUT.glob('rev-d-0[1-6]-*.svg'))):
    source=ET.parse(path).getroot()
    prefix=f'p{i+1}-'
    group=ET.SubElement(root,f'{{{SVG}}}g',{
        'id':f'circuit-{i+1}', 'data-circuit-source':path.name,
        'data-source-sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'transform':f'translate({margin+(i%3)*(tile_w+gap):.6f},{105+(i//3)*(tile_h+10):.6f}) scale({scale:.9f})'})
    for child in list(source):
        if child.tag.rsplit('}',1)[-1] in ['title','desc']:continue
        el=copy.deepcopy(child)
        for parent in el.iter():
            for t in list(parent):
                if t.tag.endswith('text') and ((t.text or '').startswith('REV D  |') or (t.text or '').startswith('Solid dot =')):
                    parent.remove(t)
        for item in el.iter():
            if 'id' in item.attrib:item.set('id',prefix+item.get('id'))
            for key,value in list(item.attrib.items()):
                value=re.sub(r'url\(#([^)]*)\)',lambda m:'url(#'+prefix+m[1]+')',value)
                value=value.replace('font-family: DejaVu-Bold;', 'font-family: DejaVu Sans; font-weight: bold;')
                value=value.replace('font-family: DejaVu;', 'font-family: DejaVu Sans;')
                item.set(key,value)
        group.append(el)
    sources.append(path.name)
assert len(sources)==6, 'All six circuit sheets are required'

y=1610
rect(24,y,W-48,27,NAVY)
text(34,y+19,'EVERY EXTERNAL CONNECTION  /  126 CONDUCTORS',15,True,'white')
text(1170,y+19,'Matching net labels join electrically across sections. Dot = junction; crossing without dot = no connection.',12,False,'white')
rows=math.ceil(len(N['wires'])/4);col_w=(W-48-3*16)/4
for col in range(4):
    x=24+col*(col_w+16)
    for dx,label in [(8,'WIRE'),(80,'NET'),(325,'FROM'),(550,'TO')]:text(x+dx,y+48,label,11,True)
    for k,w in enumerate(N['wires'][col*rows:(col+1)*rows]):
        yy=y+66+k*13
        g=ET.SubElement(root,f'{{{SVG}}}g',{
            'data-wire-id':w['id'],'data-net':w['net'],'data-from':w['from'],'data-to':w['to']})
        if k%2==0:rect(x,yy-10,col_w,13,parent=g)
        for dx,s,mx in [(8,w['id'],62),(80,w['net'],235),(325,w['from'],215),(550,w['to'],col_w-558)]:
            text(x+dx,yy,s,10.5,dx==8,parent=g,max_width=mx)

y=2150
rect(24,y,W-48,25,NAVY)
text(34,y+18,'COMPONENT SCHEDULE  /  ALL 49 REFERENCES',14,True,'white')
text(1170,y+18,'Resistors: 1% • ceramic bypass: X7R 50 V • electrolytics: 35 V / 105 °C • diode band identifies cathode K',11,False,'white')
parts=list(N['components'].items());rows=math.ceil(len(parts)/6);cw=(W-48-5*16)/6
for col in range(6):
    x=24+col*(cw+16)
    for k,(ref,c) in enumerate(parts[col*rows:(col+1)*rows]):
        yy=y+41+k*13
        g=ET.SubElement(root,f'{{{SVG}}}g',{'data-component-ref':ref,'data-component-part':c['part']})
        text(x+4,yy,ref,10.5,True,parent=g)
        text(x+60,yy,c['part'],10.5,parent=g,max_width=cw-66)

y=2320
text(28,y,'INTERNAL COMMONS — no added jumper:',10.5,True)
text(285,y,'U1 GND1 = GND2; U2 GND = OUT_GND; U4 pin 2 = tab; each HSD LOAD_GND = G = G0…G7.',10.5)
text(1260,y,'UNUSED:',10.5,True)
text(1322,y,'O1/O2 JP2_1; O2 OUT2; K1 2/5/6/9; HSD3 CH5/6/7; U1 3V3, A1/A2/A3/A6/A7, AREF, RESET1/2, RX/TX, D5/D6/D7/D10/D11/D12/D13.',10.5)
text(28,y+20,'READING:',10.5,True)
text(95,y+20,'Pin names are functional labels, not footprints. Repeated distribution points mean joined bus terminals. Route lamp/valve returns separately from logic/ADC returns.',10.5)
text(1260,y+20,'HOLD POINTS:',10.5,True,RED)
text(1360,y+20,'H1 actual machine cavities; H2 existing fuse / wire ratings; H3 purchased parts; H4 valve signal common / compliance; H5 firmware and bench qualification.',10.5,False,RED)
text(28,H-19,'Revision D removes external temperature sensing. Use the complete audit for qualification and power-up steps. Power removal does not guarantee water stops.',11,True,RED)
text(2450,H-19,'Netlist SHA-256: '+root.get('data-netlist-sha256')[:16]+'…   |   SHEET 1 OF 1',11,True)

svg=OUT/'water-controller-single-page-rev-d.svg'
ET.ElementTree(root).write(svg,encoding='utf-8',xml_declaration=True)
pdf=svg.with_suffix('.pdf');png=svg.with_suffix('.png')
subprocess.run(['inkscape',str(svg),'--export-type=pdf','--export-filename='+str(pdf)],check=True,stdout=subprocess.DEVNULL)
subprocess.run(['inkscape',str(svg),'--export-type=png','--export-width=4800','--export-filename='+str(png)],check=True,stdout=subprocess.DEVNULL)
reader=PdfReader(pdf);assert len(reader.pages)==1,'PDF must have exactly one page'
page_text=reader.pages[0].extract_text()
assert sorted(re.findall(r'W\d{3}',page_text))==sorted(w['id'] for w in N['wires']), 'PDF must contain each wire ID exactly once'
for ref in N['components']:assert re.search(r'\b'+ref+r'\b',page_text),'Missing PDF component '+ref
(DATA/'single-page-manifest.json').write_text(json.dumps({
    'revision':'D', 'pdf_pages':len(reader.pages),
    'netlist_sha256':hashlib.sha256((DATA/'netlist.json').read_bytes()).hexdigest(),
    'outputs':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [svg,pdf,png]}
},indent=2)+'\n')
print(json.dumps({'pdf_pages':1,'wires':len(N['wires']),'components':len(parts),'circuit_sections':len(sources),'output':str(pdf)},indent=2))
