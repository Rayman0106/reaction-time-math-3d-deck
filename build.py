"""Build a self-contained deck with attributed, embedded Sketchfab assets."""
from pathlib import Path
import base64, json, hashlib, argparse, re
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'src'
parser=argparse.ArgumentParser(description='Build the release deck, or a local-asset development preview.')
parser.add_argument('output',nargs='?',default=str(ROOT/'index.html'))
parser.add_argument('--motion-file',type=Path,help='Optional independently licensed local motion JSON; never uploaded by this builder.')
parser.add_argument('--dev',action='store_true',help='Use shared local model/font files and presenter controls.')
parser.add_argument('--release',action='store_true',help='Use only three public navigation controls, also with --dev.')
options=parser.parse_args();OUT=Path(options.output)
def read(name):
 path=ROOT/name
 return (path if path.is_file() else SOURCE/name).read_text(encoding='utf-8')
def encoded(data,mime): return 'data:'+mime+';base64,'+base64.b64encode(data).decode()
def uri(name,mime): return encoded((ROOT/name).read_bytes(),mime)
imports={'three':uri('vendor/three.module.min.js','text/javascript'),
 'three/addons/utils/BufferGeometryUtils.js':uri('vendor/BufferGeometryUtils.js','text/javascript'),
 'three/addons/loaders/GLTFLoader.js':encoded(read('vendor/GLTFLoader.js').replace('../utils/BufferGeometryUtils.js','three/addons/utils/BufferGeometryUtils.js').encode(),'text/javascript')}
dev=options.dev;release=options.release or not dev
models={name:('assets/models/'+file if dev else uri('assets/models/'+file,'model/gltf-binary')) for name,file in {'pc':'gaming-desktop-pc.glb','character':'student.glb','room':'room.glb','bookshelf':'bookshelf.glb'}.items() if (ROOT/'assets/models'/file).exists()}
font_faces='\n'.join('@font-face{font-family:"'+name+'";font-style:normal;font-weight:'+weight+';font-display:block;src:url("'+('assets/fonts/'+file if dev else uri('assets/fonts/'+file,'font/ttf'))+'") format("truetype");}' for name,file,weight in [('Instrument Serif','InstrumentSerif-Regular.ttf','400'),('Manrope','Manrope.ttf','200 800')])
replacements={
 '/*__RELEASE__*/':json.dumps(release),
 '/*__PREPARATION__*/':read('preparation.js'),
 '/*__CSS__*/':read('style.css').replace('/*__FONT_FACES__*/',font_faces), '/*__CONTENT__*/':read('content.js'), '/*__PRACTICE__*/':read('practice.js')+'\n'+read('opening-loop.js'),
 '/*__SPLITTING__*/':read('vendor/splitting.min.js'), '/*__TYPOGRAPHY__*/':read('letter-ink.js')+'\n'+read('type-choreography.js')+'\n'+read('typography.js'),
 '/*__CHARTS__*/':read('charts.js'), '/*__MOTION__*/':read('motion.js')+'\n'+read('analysis-transitions.js'), '/*__CAMERA__*/':read('camera.js'),
 '/*__RIG_DATA__*/':(options.motion_file.read_text(encoding='utf-8') if options.motion_file else read('assets/motion/study-motion.json')), '/*__RIG_MOTION__*/':read('rig-motion.js'),
 '/*__CHARACTER__*/':read('character.js'), '/*__PROPS__*/':read('props.js'), '/*__SPEAKERS__*/':read('speakers.js'),
 '/*__ENVIRONMENT__*/':read('environment.js'), '/*__WORKSTATION__*/':read('workstation.js'), '/*__SCREEN_TRANSITION__*/':read('screen-transition.js'), '/*__ART_DIRECTION__*/':read('art-direction.js'), '/*__SCENE__*/':read('scene.js'),
 '/*__RUNTIME__*/':read('runtime.js'), '/*__IMPORTS__*/':json.dumps({'imports':imports}),
 '/*__MODELS__*/':json.dumps(models),
 '/*__ASSETS__*/':json.dumps({'screenLimitations':uri('assets/screen-limitations.png','image/png'),'screenAnalysis':uri('assets/screen-analysis.png','image/png'),'histogram':uri('assets/histogram.png','image/png'),'cumulative':uri('assets/cumulative.png','image/png')})}
result=read('index.template.html')
if release:
 nav=re.search(r'<nav id="controls"[^>]*>.*?</nav>',result,re.S)
 if not nav:raise RuntimeError('Missing presentation controls')
 buttons=re.findall(r'<button\b[^>]*>.*?</button>',nav.group(),re.S)
 kept=[b for b in buttons if any('id="'+name+'"' in b for name in ['prev','next','overview'])]
 if len(kept)!=3:raise RuntimeError('Release requires exactly prev, next and overview')
 result=result[:nav.start()]+'<nav id="controls" aria-label="Presentation controls">'+''.join(kept)+'</nav>'+result[nav.end():]
 # Keep attribution accessible from Slides without an extra toolbar action.
 credits=re.search(r'<aside id="credits".*?<div class="credits-content">(.*?)</div></aside>',result,re.S)
 if not credits:raise RuntimeError('Missing model attribution')
 credit_html='<section class="release-credits" aria-label="Sources and licences"><h2>Sources &amp; licences</h2>'+credits.group(1)+'</section>'
 result=result[:credits.start()]+result[credits.end():]
 result,count=re.subn(r'<aside id="notes".*?</aside>','',result,count=1,flags=re.S)
 if count!=1:raise RuntimeError('Missing presenter notes panel')
 result=result.replace('<div id="overview-grid"></div>','<div id="overview-grid"></div>'+credit_html,1)
result=result.replace('</head>', '<!-- Three.js 0.160.0 license\n'+read('vendor/THREE-LICENSE.txt')+'\n-->\n</head>')
result=result.replace('</head>','<!-- Instrument Serif OFL\n'+read('assets/fonts/InstrumentSerif-OFL.txt')+'\nManrope OFL\n'+read('assets/fonts/Manrope-OFL.txt')+'\n-->\n</head>')
result=result.replace('</head>','<!-- Splitting.js MIT license\n'+read('vendor/SPLITTING-LICENSE.txt')+'\n-->\n</head>')
for key,value in replacements.items():
 if result.count(key)!=1: raise RuntimeError('Expected one token '+key)
 result=result.replace(key,value)
if '/*__' in result: raise RuntimeError('Unresolved build tokens')
OUT.parent.mkdir(parents=True,exist_ok=True)
tmp=OUT.with_suffix('.tmp.html');tmp.write_text(result,encoding='utf-8');tmp.replace(OUT)
print(json.dumps({'output':str(OUT),'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'models':list(models),'release':release,'localAssets':dev}))
