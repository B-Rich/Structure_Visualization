/*! icn3d.js
 * iCn3D has been developed based on iview (http://istar.cse.cuhk.edu.hk/iview/). The following new features has been added so far.
 * 1. Allowed users to pick atoms, both in perspective and orthographics camera. In order to make this work, the methods of rotation, translation and zooming have been dramatically changed.
 * 2. Allowed users to select residues based on structure, chain, sequence, etc. Userscan also defne their own subset and save the selection.
 * 3. Used standard libraries from three.js for rotation, translation, and zooming.
 * 4. Improved the labeling mechanism.
 * 5. The picking allows users to pick atoms, add labels, choose a new rotation center, etc.
 * 6. Added key operations for rotation, translation, and zooming.
 * 7. Enabled to show nucleotides.
 * 8. Make the tubes shiny.
 * 9. Enabled to save the current state and open the state later.
 *
 * iCn3D used the following standard libraries. We can easily adopt the new versions of these libraries.
 * 1. jquery and jquery ui. Jquery ui is used for show the menu at the top.
 * 2. Recent version of Three.js.
 * 3. surface.js from the iview group in Hongkong for displaying molecular surfaces.
 *
 * Files in #4-9 are combined in one file: full_ui_all.min.js.
 *
 * 4. The rotation, translation operation libraries from Three.js: TrackballControls.js and OrthographicTrackballControls.js.
 * 5. Projector.js from Three.js for the picking.
 * 6. Canvas render library: CanvasRenderer.js. This is used when WebGL render is no working in the browser.
 * 7. A library to detect whether WebGL is working in the browser: Detector.js.
 * 8. The 3D drawing library: icn3d.js
 * 9. Advanced UI library for iCn3D: full_ui.js.
 */

if (typeof jQuery === 'undefined') { throw new Error('iCn3D requires jQuery') }

var iCn3D = function (id) {
    this.REVISION = '1';
    this.id = id;
    this.container = $('#' + id);

    this.overdraw = 0;

    this.bHighlight = 1; // undefined: no highlight, 1: highlight by outline, 2: highlight by 3D object

    if(Detector.webgl){
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.container.get(0),
            antialias: true,
            preserveDrawingBuffer: true
        });

        //this.renderer.shadowMapType = THREE.PCFSoftShadowMap; // options are THREE.BasicShadowMap | THREE.PCFShadowMap | THREE.PCFSoftShadowMap

        this.overdraw = 0;
    }
    else {
        //alert("Either your browser or your graphics card does not seem to support WebGL. CanvasRenderer instead of WebGLRenderer is used.");
        alert("Currently your web browser has a problem on WebGL, and CanvasRenderer instead of WebGLRenderer is used. If you are using Chrome, open a new tab for the same URL and WebGL may work again.");

        this.renderer = new THREE.CanvasRenderer({
            canvas: this.container.get(0)
        });

        //http://threejs.org/docs/api/materials/Material.html
        this.overdraw = 0.5;

        // only WebGL support outlines using ShaderMaterial
        this.bHighlight = 2;
    }

    this.matShader = this.setOutlineColor('yellow');
    this.fractionOfColor = new THREE.Color(0.1, 0.1, 0.1);


    // adjust the size
    this.WIDTH = this.container.width(), this.HEIGHT = this.container.height();
    this.setWidthHeight(this.WIDTH, this.HEIGHT);

    this.axis = false;  // used to turn on and off xyz axes

    // picking
    this.picking = 1; // 0: no picking, 1: picking on atoms, 2: picking on residues

    this.pickpair = false; // used for picking pair of atoms for label and distance
    this.pickedatomNum = 0;

    this.pickedatom = undefined;
    this.pickedatom2 = undefined;

    this.bStopRotate = false; // by default, do not stop the possible automatic rotation
    this.bCalphaOnly = false; // by default the input has both Calpha and O, used for drawing strands. If atoms have Calpha only, the orientation of the strands is random
    this.bSSOnly = false; // a flag to turn on when only helix and bricks are available to draw 3D diagram

    this.effects = {
        //'anaglyph': new THREE.AnaglyphEffect(this.renderer),
        //'parallax barrier': new THREE.ParallaxBarrierEffect(this.renderer),
        //'oculus rift': new THREE.OculusRiftEffect(this.renderer),
        //'stereo': new THREE.StereoEffect(this.renderer),
        'none': this.renderer
    };

    this.maxD = 500; // size of the molecule
    //this.camera_z = -150;

    //this.camera_z = this.maxD * 2; // when zooming in, it gets dark if the camera is in front
    this.camera_z = -this.maxD * 2;

    // these variables will not be cleared for each structure
    this.commands = []; // a list of commands, ordered by the operation steps. Each operation will be converted into a command. this command list can be used to go backward and forward.
    this.logs = []; // a list of comands and other logs, ordered by the operation steps.

    this.bRender = true; // a flag to turn off rendering when loading state file

    // Default values
    this.highlightColor = new THREE.Color(0xFFFF00);

    this.sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 32, 1);
    this.cylinderGeometryOutline = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);
    this.sphereRadius = 1.5;
    this.cylinderRadius = 0.4;
    this.linewidth = 1;
    this.curveWidth = 3;
    this.helixSheetWidth = 1.3;
    this.coilWidth = 0.3;
    this.thickness = 0.4;
    this.axisDIV = 5; // 3
    this.strandDIV = 6;
    this.tubeDIV = 8;

    this.LABELSIZE = 40;

    this.nucleicAcidStrandDIV = 6; //4;
    this.nucleicAcidWidth = 0.8;

    this.options = {
        camera: 'perspective',
        background: 'black',
        color: 'spectrum',
        sidechains: 'nothing',
        secondary: 'cylinder & plate',
        surface: 'Van der Waals surface',
        wireframe: 'no',
        opacity: '0.8',
        ligands: 'stick',
        water: 'nothing',
        ions: 'sphere',
        //labels: 'no',
        //effect: 'none',
        hbonds: 'no',
        labels: 'no',
        lines: 'no',
        rotationcenter: 'molecule center',
        axis: 'no',
        picking: 'no',
        nucleotides: 'nucleotide cartoon',
        showsurface: 'no'
    };

    this._zoomFactor = 1.0;
    this.mouseChange = new THREE.Vector2(0,0);
    this.quaternion = new THREE.Quaternion(0,0,0,1);

    var me = this;
    this.container.bind('contextmenu', function (e) {
        e.preventDefault();
    });

    // key event has to use the document because it requires teh focus
    me.typetext = false;
    $(document).bind('keydown', function (e) {
      if (!me.controls) return;

      me.bStopRotate = true;

      $('input, textarea').focus(function() {
        me.typetext = true;
      });

      $('input, textarea').blur(function() {
        me.typetext = false;
      });

      if(!me.typetext) {
        // zoom
        if(e.keyCode === 90 ) { // Z
          var para = {};

          if(me.camera === me.perspectiveCamera) { // perspective
            para._zoomFactor = 0.9;
          }
          else if(me.camera === me.orthographicCamera) {  // orthographics
            if(me._zoomFactor < 0.1) {
              me._zoomFactor = 0.1;
            }
            else if(me._zoomFactor > 1) {
              me._zoomFactor = 1;
            }

            para._zoomFactor = me._zoomFactor * 0.9;
            if(para._zoomFactor < 0.1) para._zoomFactor = 0.1;
          }

          para.update = true;
          me.controls.update(para);
        }
        else if(e.keyCode === 88 ) { // X
          var para = {};

          if(me.camera === me.perspectiveCamera) { // perspective
            para._zoomFactor = 1.1;
          }
          else if(me.camera === me.orthographicCamera) {  // orthographics
            if(me._zoomFactor > 20) {
              me._zoomFactor = 20;
            }
            else if(me._zoomFactor < 1) {
              me._zoomFactor = 1;
            }

            para._zoomFactor = me._zoomFactor * 1.03;
            if(para._zoomFactor > 20) para._zoomFactor = 20;
          }

          para.update = true;
          me.controls.update(para);
        }

        // rotate
        else if(e.keyCode === 76 ) { // L, rotate left
          var axis = new THREE.Vector3(0,1,0);
          var angle = -5.0 / 180.0 * Math.PI;

          axis.applyQuaternion( me.camera.quaternion ).normalize();

          var quaternion = new THREE.Quaternion();
          quaternion.setFromAxisAngle( axis, -angle );

          var para = {};
          para.quaternion = quaternion;
          para.update = true;

          me.controls.update(para);
        }
        else if(e.keyCode === 74 ) { // J, rotate right
          var axis = new THREE.Vector3(0,1,0);
          var angle = 5.0 / 180.0 * Math.PI;

          axis.applyQuaternion( me.camera.quaternion ).normalize();

          var quaternion = new THREE.Quaternion();
          quaternion.setFromAxisAngle( axis, -angle );

          var para = {};
          para.quaternion = quaternion;
          para.update = true;

          me.controls.update(para);
        }
        else if(e.keyCode === 73 ) { // I, rotate up
          var axis = new THREE.Vector3(1,0,0);
          var angle = -5.0 / 180.0 * Math.PI;

          axis.applyQuaternion( me.camera.quaternion ).normalize();

          var quaternion = new THREE.Quaternion();
          quaternion.setFromAxisAngle( axis, -angle );

          var para = {};
          para.quaternion = quaternion;
          para.update = true;

          me.controls.update(para);
        }
        else if(e.keyCode === 77 ) { // M, rotate down
          var axis = new THREE.Vector3(1,0,0);
          var angle = 5.0 / 180.0 * Math.PI;

          axis.applyQuaternion( me.camera.quaternion ).normalize();

          var quaternion = new THREE.Quaternion();
          quaternion.setFromAxisAngle( axis, -angle );

          var para = {};
          para.quaternion = quaternion;
          para.update = true;

          me.controls.update(para);
        }

        // translate
        else if(e.keyCode === 37 ) { // <-, translate left
          e.preventDefault();
          var mouseChange = new THREE.Vector2(0,0);

          // 1 means the full screen size
          mouseChange.x -= 0.01;

          var para = {};
          para.mouseChange = mouseChange;
          para.update = true;

          me.controls.update(para);
        }
        else if(e.keyCode === 39 ) { // ->, translate right
          e.preventDefault();
          var mouseChange = new THREE.Vector2(0,0);

          mouseChange.x += 0.01;

          var para = {};
          para.mouseChange = mouseChange;
          para.update = true;

          me.controls.update(para);
        }
        else if(e.keyCode === 38 ) { // arrow up, translate up
          e.preventDefault();
          var mouseChange = new THREE.Vector2(0,0);

          mouseChange.y -= 0.01;

          var para = {};
          para.mouseChange = mouseChange;
          para.update = true;

          me.controls.update(para);
        }
        else if(e.keyCode === 40 ) { // arrow down, translate down
          e.preventDefault();
          var mouseChange = new THREE.Vector2(0,0);

          mouseChange.y += 0.01;

          var para = {};
          para.mouseChange = mouseChange;
          para.update = true;

          me.controls.update(para);
        }

        me.render();
      }
    });

    this.container.bind('mouseup touchend', function (e) {
        me.isDragging = false;
    });
    this.container.bind('mousedown touchstart', function (e) {
        e.preventDefault();

        if (!me.scene) return;

        me.bStopRotate = true;

        var x = e.pageX, y = e.pageY;
        if (e.originalEvent.targetTouches && e.originalEvent.targetTouches[0]) {
            x = e.originalEvent.targetTouches[0].pageX;
            y = e.originalEvent.targetTouches[0].pageY;
        }
        me.isDragging = true;

        // see ref http://soledadpenades.com/articles/three-js-tutorials/object-picking/
        if(me.picking) {
            me.mouse.x = ( (x - me.container.offset().left) / me.container.width() ) * 2 - 1;
            me.mouse.y = - ( (y - me.container.offset().top) / me.container.height() ) * 2 + 1;

            var mouse3 = new THREE.Vector3();
            mouse3.x = me.mouse.x;
            mouse3.y = me.mouse.y;
            //mouse3.z = 0.5;
            if(this.camera_z > 0) {
              mouse3.z = -1.0; // between -1 to 1. The z positio of mouse in the real world should be between the camera and the target."-1" worked in our case.
            }
            else {
              mouse3.z = 1.0; // between -1 to 1. The z positio of mouse in the real world should be between the camera and the target."-1" worked in our case.
            }

            // similar to setFromCamera() except mouse3.z is the opposite sign from the value in setFromCamera()
            if(me.camera === me.perspectiveCamera) { // perspective
                if(this.camera_z > 0) {
                  mouse3.z = -1.0;
                }
                else {
                  mouse3.z = 1.0;
                }
                //me.projector.unprojectVector( mouse3, me.camera );  // works for all versions
                mouse3.unproject(me.camera );  // works for all versions
                me.raycaster.set(me.camera.position, mouse3.sub(me.camera.position).normalize()); // works for all versions
            }
            else if(me.camera === me.orthographicCamera) {  // orthographics
                if(this.camera_z > 0) {
                  mouse3.z = 1.0;
                }
                else {
                  mouse3.z = -1.0;
                }
                //me.projector.unprojectVector( mouse3, me.camera );  // works for all versions
                mouse3.unproject(me.camera );  // works for all versions
                me.raycaster.set(mouse3, new THREE.Vector3(0,0,-1).transformDirection( me.camera.matrixWorld )); // works for all versions
            }

            var intersects = me.raycaster.intersectObjects( me.objects ); // not all "mdl" group will be used for picking
            if ( intersects.length > 0 ) {
                // the intersections are sorted so that the closest point is the first one.
                intersects[ 0 ].point.sub(me.mdl.position); // mdl.position was moved to the original (0,0,0) after reading the molecule coordinates. The raycasting was done based on the original. The positio of the ooriginal should be substracted.

                var threshold = 1;
                var atom = me.getAtomsFromPosition(intersects[ 0 ].point, threshold); // the second parameter is the distance threshold. The first matched atom will be returned. Use 1 angstrom, not 2 angstrom. If it's 2 angstrom, other atom will be returned.

                while(!atom && threshold < 10) {
                    ++threshold;
                    atom = me.getAtomsFromPosition(intersects[ 0 ].point, threshold);
                }

                if(atom) {
                    if(me.pickpair) {
                      if(me.pickedatomNum % 2 === 0) {
                        me.pickedatom = atom;
                      }
                      else {
                        me.pickedatom2 = atom;
                      }

                      ++me.pickedatomNum;
                    }
                    else {
                      me.pickedatom = atom;
                    }

                      me.showPicking(atom);
                }
                else {
                    console.log("No atoms were found in 10 andstrom range");
                }
            } // end if
        }

        me.controls.handleResize();
        me.controls.update();
        me.render();
    });
    this.container.bind('mousemove touchmove', function (e) {
        e.preventDefault();
        if (!me.scene) return;
        // no action when no mouse button is clicked and no key was down
        if (!me.isDragging) return;

        me.controls.handleResize();
        me.controls.update();
        me.render();
    });
    this.container.bind('mousewheel', function (e) {
        e.preventDefault();
        if (!me.scene) return;

        me.bStopRotate = true;

//        me.rot.position.z -= e.originalEvent.wheelDelta * 0.025;
        me.controls.handleResize();
        me.controls.update();

        me.render();
    });
    this.container.bind('DOMMouseScroll', function (e) {
        e.preventDefault();
        if (!me.scene) return;

        me.bStopRotate = true;

//        me.rot.position.z += e.originalEvent.detail;
        me.controls.handleResize();
        me.controls.update();

        me.render();
    });
};

iCn3D.prototype = {

    constructor: iCn3D,

    setOutlineColor: function(colorStr) {
        // outline using ShaderMaterial: http://jsfiddle.net/Eskel/g593q/9/
        var shader = {
            'outline' : {
                vertex_shader: [
                    "uniform float offset;",
                    "void main() {",
                        "vec4 pos = modelViewMatrix * vec4( position + normal * offset, 1.0 );",
                        "gl_Position = projectionMatrix * pos;",
                    "}"
                ].join("\n"),

                fragment_shader: [
                    "void main(){",
                        "gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0 );",
                    "}"
                ].join("\n")
            }
        };

        if(colorStr === 'yellow') {
           shader.outline.fragment_shader = [
               "void main(){",
                   "gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0 );",
               "}"
           ].join("\n");
        }
        else if(colorStr === 'green') {
           shader.outline.fragment_shader = [
               "void main(){",
                   "gl_FragColor = vec4( 0.0, 1.0, 0.0, 1.0 );",
               "}"
           ].join("\n");
        }
        else if(colorStr === 'red') {
           shader.outline.fragment_shader = [
               "void main(){",
                   "gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );",
               "}"
           ].join("\n");
        }

        // shader
        var uniforms = {offset: {
            type: "f",
            //value: 1
            value: 0.5
          }
        };

        var outShader = shader['outline'];

        var matShader = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: outShader.vertex_shader,
            fragmentShader: outShader.fragment_shader,
            depthTest: false,
            depthWrite: false,
            needsUpdate: true
        });

        return matShader;
    },

    setWidthHeight: function(width, height) {
        this.renderer.setSize(width, height);

        this.container.widthInv  = 1 / width;
        this.container.heightInv = 1 / height;
        this.container.whratio = width / height;
    },

    // added nucleotides and ions
    nucleotidesArray: ['  G', '  A', '  T', '  C', '  U', ' DG', ' DA', ' DT', ' DC', ' DU'],

    ionsArray: [' NA', ' MG', ' AL', ' CA', ' TI', ' MN', ' FE', ' NI', ' CU', ' ZN', ' AG', ' BA', '  F', ' CL', ' BR', '  I'],

    vdwRadii: { // Hu, S.Z.; Zhou, Z.H.; Tsai, K.R. Acta Phys.-Chim. Sin., 2003, 19:1073.
         H: 1.08,
        HE: 1.34,
        LI: 1.75,
        BE: 2.05,
         B: 1.47,
         C: 1.49,
         N: 1.41,
         O: 1.40,
         F: 1.39,
        NE: 1.68,
        NA: 1.84,
        MG: 2.05,
        AL: 2.11,
        SI: 2.07,
         P: 1.92,
         S: 1.82,
        CL: 1.83,
        AR: 1.93,
         K: 2.05,
        CA: 2.21,
        SC: 2.16,
        TI: 1.87,
         V: 1.79,
        CR: 1.89,
        MN: 1.97,
        FE: 1.94,
        CO: 1.92,
        NI: 1.84,
        CU: 1.86,
        ZN: 2.10,
        GA: 2.08,
        GE: 2.15,
        AS: 2.06,
        SE: 1.93,
        BR: 1.98,
        KR: 2.12,
        RB: 2.16,
        SR: 2.24,
         Y: 2.19,
        ZR: 1.86,
        NB: 2.07,
        MO: 2.09,
        TC: 2.09,
        RU: 2.07,
        RH: 1.95,
        PD: 2.02,
        AG: 2.03,
        CD: 2.30,
        IN: 2.36,
        SN: 2.33,
        SB: 2.25,
        TE: 2.23,
         I: 2.23,
        XE: 2.21,
        CS: 2.22,
        BA: 2.51,
        LA: 2.40,
        CE: 2.35,
        PR: 2.39,
        ND: 2.29,
        PM: 2.36,
        SM: 2.29,
        EU: 2.33,
        GD: 2.37,
        TB: 2.21,
        DY: 2.29,
        HO: 2.16,
        ER: 2.35,
        TM: 2.27,
        YB: 2.42,
        LU: 2.21,
        HF: 2.12,
        TA: 2.17,
         W: 2.10,
        RE: 2.17,
        OS: 2.16,
        IR: 2.02,
        PT: 2.09,
        AU: 2.17,
        HG: 2.09,
        TL: 2.35,
        PB: 2.32,
        BI: 2.43,
        PO: 2.29,
        AT: 2.36,
        RN: 2.43,
        FR: 2.56,
        RA: 2.43,
        AC: 2.60,
        TH: 2.37,
        PA: 2.43,
         U: 2.40,
        NP: 2.21,
        PU: 2.56,
        AM: 2.56,
        CM: 2.56,
        BK: 2.56,
        CF: 2.56,
        ES: 2.56,
        FM: 2.56,
    },

    covalentRadii: { // http://en.wikipedia.org/wiki/Covalent_radius
         H: 0.31,
        HE: 0.28,
        LI: 1.28,
        BE: 0.96,
         B: 0.84,
         C: 0.76,
         N: 0.71,
         O: 0.66,
         F: 0.57,
        NE: 0.58,
        NA: 1.66,
        MG: 1.41,
        AL: 1.21,
        SI: 1.11,
         P: 1.07,
         S: 1.05,
        CL: 1.02,
        AR: 1.06,
         K: 2.03,
        CA: 1.76,
        SC: 1.70,
        TI: 1.60,
         V: 1.53,
        CR: 1.39,
        MN: 1.39,
        FE: 1.32,
        CO: 1.26,
        NI: 1.24,
        CU: 1.32,
        ZN: 1.22,
        GA: 1.22,
        GE: 1.20,
        AS: 1.19,
        SE: 1.20,
        BR: 1.20,
        KR: 1.16,
        RB: 2.20,
        SR: 1.95,
         Y: 1.90,
        ZR: 1.75,
        NB: 1.64,
        MO: 1.54,
        TC: 1.47,
        RU: 1.46,
        RH: 1.42,
        PD: 1.39,
        AG: 1.45,
        CD: 1.44,
        IN: 1.42,
        SN: 1.39,
        SB: 1.39,
        TE: 1.38,
         I: 1.39,
        XE: 1.40,
        CS: 2.44,
        BA: 2.15,
        LA: 2.07,
        CE: 2.04,
        PR: 2.03,
        ND: 2.01,
        PM: 1.99,
        SM: 1.98,
        EU: 1.98,
        GD: 1.96,
        TB: 1.94,
        DY: 1.92,
        HO: 1.92,
        ER: 1.89,
        TM: 1.90,
        YB: 1.87,
        LU: 1.87,
        HF: 1.75,
        TA: 1.70,
         W: 1.62,
        RE: 1.51,
        OS: 1.44,
        IR: 1.41,
        PT: 1.36,
        AU: 1.36,
        HG: 1.32,
        TL: 1.45,
        PB: 1.46,
        BI: 1.48,
        PO: 1.40,
        AT: 1.50,
        RN: 1.50,
        FR: 2.60,
        RA: 2.21,
        AC: 2.15,
        TH: 2.06,
        PA: 2.00,
         U: 1.96,
        NP: 1.90,
        PU: 1.87,
        AM: 1.80,
        CM: 1.69,
    },

    //rasmol-like element colors
    atomColors: {
        'H': new THREE.Color(0xFFFFFF),
        'He': new THREE.Color(0xFFC0CB),
        'HE': new THREE.Color(0xFFC0CB),
        'Li': new THREE.Color(0xB22222),
        'LI': new THREE.Color(0xB22222),
        'B': new THREE.Color(0x00FF00),
        'C': new THREE.Color(0xC8C8C8),
        'N': new THREE.Color(0x8F8FFF),
        'O': new THREE.Color(0xF00000),
        'F': new THREE.Color(0xDAA520),
        'Na': new THREE.Color(0x0000FF),
        'NA': new THREE.Color(0x0000FF),
        'Mg': new THREE.Color(0x228B22),
        'MG': new THREE.Color(0x228B22),
        'Al': new THREE.Color(0x808090),
        'AL': new THREE.Color(0x808090),
        'Si': new THREE.Color(0xDAA520),
        'SI': new THREE.Color(0xDAA520),
        'P': new THREE.Color(0xFFA500),
        'S': new THREE.Color(0xFFC832),
        'Cl': new THREE.Color(0x00FF00),
        'CL': new THREE.Color(0x00FF00),
        'Ca': new THREE.Color(0x808090),
        'CA': new THREE.Color(0x808090),
        'Ti': new THREE.Color(0x808090),
        'TI': new THREE.Color(0x808090),
        'Cr': new THREE.Color(0x808090),
        'CR': new THREE.Color(0x808090),
        'Mn': new THREE.Color(0x808090),
        'MN': new THREE.Color(0x808090),
        'Fe': new THREE.Color(0xFFA500),
        'FE': new THREE.Color(0xFFA500),
        'Ni': new THREE.Color(0xA52A2A),
        'NI': new THREE.Color(0xA52A2A),
        'Cu': new THREE.Color(0xA52A2A),
        'CU': new THREE.Color(0xA52A2A),
        'Zn': new THREE.Color(0xA52A2A),
        'ZN': new THREE.Color(0xA52A2A),
        'Br': new THREE.Color(0xA52A2A),
        'BR': new THREE.Color(0xA52A2A),
        'Ag': new THREE.Color(0x808090),
        'AG': new THREE.Color(0x808090),
        'I': new THREE.Color(0xA020F0),
        'Ba': new THREE.Color(0xFFA500),
        'BA': new THREE.Color(0xFFA500),
        'Au': new THREE.Color(0xDAA520),
        'AU': new THREE.Color(0xDAA520)
    },

    defaultAtomColor: new THREE.Color(0xCCCCCC),

    stdChainColors: [
            new THREE.Color(0x32CD32),
            new THREE.Color(0x1E90FF),
            new THREE.Color(0xFA8072),
            new THREE.Color(0xFFA500),
            new THREE.Color(0x00CED1),
            new THREE.Color(0xFF69B4),

            new THREE.Color(0x00FF00),
            new THREE.Color(0x0000FF),
            new THREE.Color(0xFF0000),
            new THREE.Color(0xFFFF00),
            new THREE.Color(0x00FFFF),
            new THREE.Color(0xFF00FF),

            new THREE.Color(0x3CB371),
            new THREE.Color(0x4682B4),
            new THREE.Color(0xCD5C5C),
            new THREE.Color(0xFFE4B5),
            new THREE.Color(0xAFEEEE),
            new THREE.Color(0xEE82EE),

            new THREE.Color(0x006400),
            new THREE.Color(0x00008B),
            new THREE.Color(0x8B0000),
            new THREE.Color(0xCD853F),
            new THREE.Color(0x008B8B),
            new THREE.Color(0x9400D3)
        ],

    backgroundColors: {
        black: new THREE.Color(0x000000),
         grey: new THREE.Color(0xCCCCCC),
        white: new THREE.Color(0xFFFFFF),
    },

    residueColors: {
        ALA: new THREE.Color(0xC8C8C8),
        ARG: new THREE.Color(0x145AFF),
        ASN: new THREE.Color(0x00DCDC),
        ASP: new THREE.Color(0xE60A0A),
        CYS: new THREE.Color(0xE6E600),
        GLN: new THREE.Color(0x00DCDC),
        GLU: new THREE.Color(0xE60A0A),
        GLY: new THREE.Color(0xEBEBEB),
        HIS: new THREE.Color(0x8282D2),
        ILE: new THREE.Color(0x0F820F),
        LEU: new THREE.Color(0x0F820F),
        LYS: new THREE.Color(0x145AFF),
        MET: new THREE.Color(0xE6E600),
        PHE: new THREE.Color(0x3232AA),
        PRO: new THREE.Color(0xDC9682),
        SER: new THREE.Color(0xFA9600),
        THR: new THREE.Color(0xFA9600),
        TRP: new THREE.Color(0xB45AB4),
        TYR: new THREE.Color(0x3232AA),
        VAL: new THREE.Color(0x0F820F),
        ASX: new THREE.Color(0xFF69B4),
        GLX: new THREE.Color(0xFF69B4),
    },

    defaultResidueColor: new THREE.Color(0xBEA06E),

    polarityColors: {
        ARG: new THREE.Color(0xCC0000),
        HIS: new THREE.Color(0xCC0000),
        LYS: new THREE.Color(0xCC0000),
        ASP: new THREE.Color(0xCC0000),
        GLU: new THREE.Color(0xCC0000),
        SER: new THREE.Color(0xCC0000),
        THR: new THREE.Color(0xCC0000),
        ASN: new THREE.Color(0xCC0000),
        GLN: new THREE.Color(0xCC0000),
        TYR: new THREE.Color(0xCC0000),
        GLY: new THREE.Color(0x00CCCC),
        PRO: new THREE.Color(0x00CCCC),
        ALA: new THREE.Color(0x00CCCC),
        VAL: new THREE.Color(0x00CCCC),
        LEU: new THREE.Color(0x00CCCC),
        ILE: new THREE.Color(0x00CCCC),
        MET: new THREE.Color(0x00CCCC),
        PHE: new THREE.Color(0x00CCCC),
        CYS: new THREE.Color(0x00CCCC),
        TRP: new THREE.Color(0x00CCCC),
    },

    ssColors: {
        helix: new THREE.Color(0xFF0080),
        sheet: new THREE.Color(0xFFC800),
         coil: new THREE.Color(0x6080FF),
    },

    defaultBondColor: new THREE.Color(0x2194D6),

    surfaces: {
        1: undefined,
        2: undefined,
        3: undefined,
        4: undefined
    },

    hasCovalentBond: function (atom0, atom1) {
        var r = this.covalentRadii[atom0.elem] + this.covalentRadii[atom1.elem];
        return atom0.coord.distanceToSquared(atom1.coord) < 1.3 * r * r;
    },

    init: function () {
        this.structures = {}; // molecule name -> array of chains
        this.chains = {}; // molecule_chain name -> array of residues
        this.residues = {}; // molecule_chain_resi name -> atom hash
        this.secondarys = {}; // molecule_chain_resi name -> secondary structure: 'C', 'H', or 'E'
        this.alignChains = {}; // molecule_chain name -> atom hash

        this.chainsSeq = {}; // molecule_chain name -> array of sequence
        this.chainsColor = {}; // molecule_chain name -> color, show chain color in sequence display for mmdbid and align input
        this.chainsAnno = {}; // molecule_chain name -> array of array of annotations, such as residue number
        this.chainsAnnoTitle = {}; // molecule_chain name -> array of array of annotation title

        this.alignChainsSeq = {}; // molecule_chain name -> array of residue object: {mmdbid, chain, resi, resn, aligned}
        this.alignChainsAnno = {}; // molecule_chain name -> array of array of annotations, such as residue number
        this.alignChainsAnnoTitle = {}; // molecule_chain name -> array of array of annotation title

        this.displayAtoms = {}; // show selected atoms
        this.highlightAtoms = {}; // used to change color or dislay type for certain atoms

        this.prevHighlightObjects = [];

        this.definedNames2Residues = {}; // custom defined selection name -> residue array
        this.definedNames2Atoms = {}; // custom defined selection name -> atom array
        this.definedNames2Descr = {}; // custom defined selection name -> description
        this.definedNames2Command = {}; // custom defined selection name -> command

        this.residueId2Name = {}; // molecule_chain_resi -> one letter abbreviation

        this.moleculeTitle = "";

        this.atoms = {};
        this.displayAtoms = {};
        this.highlightAtoms = {};
        this.peptides = {};
        this.nucleotides = {};
        this.nucleotidesP = {};
        //this.peptidesnucleotides = {};
        //this.hetatms = {};
        this.ligands = {};
        this.ions = {};
        this.water = {};
        this.calphas = {};

        //this.hbonds = {};
        this.hbondpoints = [];

        this.atomPrevColors = {};

        this.style2atoms = {}; // style -> atom hash, 13 styles: ribbon, strand, cylinder & plate, nucleotide cartoon, phosphorus trace, C alpha trace, B factor tube, lines, stick, ball & stick, sphere, dot, nothing
        this.labels = []; // a list of labels. Each label contains 'position', 'text', 'size', 'color', 'background'
        this.lines = []; // a list of solid or dashed lines. Each line contains 'position1', 'position2', 'color', and a boolean of 'dashed'

        this.inputid = {"idtype": undefined, "id":undefined}; // support pdbid, mmdbid

        this.biomtMatrices = [];
        this.bAssembly = false;
    },

    loadPDB: function (src) {
        var helices = [], sheets = [];
        //this.atoms = {};
        var lines = src.split('\n');

        //var structuresTmp = {}; // serial -> atom
        var chainsTmp = {}; // serial -> atom
        var residuesTmp = {}; // serial -> atom

        this.init();

        //var hbondChainResi = [];
        var sheetArray = [], sheetStart = [], sheetEnd = [], helixArray = [], helixStart = [], helixEnd = [];

        // Concatenation of two pdbs will have several atoms for the same serial
        var serial = 0;

        var moleculeNum = 1;
        var chainNum, residueNum;
        var prevChainNum = '', prevResidueNum = '';
        var prevRecord = '';

        var oriSerial2NewSerial = {};

        for (var i in lines) {
            var line = lines[i];
            var record = line.substr(0, 6);

            if (record === 'HEADER') {
                var name = line.substr(10, 40);
                var id = line.substr(62, 4);

                this.moleculeTitle = name.trim() + " (" + id + ")";

            } else if (record === 'HELIX ') {
                var startChain = line.substr(19, 1);
                var startResi = parseInt(line.substr(21, 4));
                //var endChain = line.substr(31, 1);
                var endResi = parseInt(line.substr(33, 4));

                var chain_resi;
                for(var j = startResi; j <= endResi; ++j) {
                  chain_resi = startChain + "_" + j;
                  helixArray.push(chain_resi);

                  if(j === startResi) helixStart.push(chain_resi);
                  if(j === endResi) helixEnd.push(chain_resi);
                }

                helices.push({
                    chain: startChain,
                    initialResidue: startResi,
                    initialInscode: line.substr(25, 1),
                    terminalResidue: endResi,
                    terminalInscode: line.substr(37, 1),
                });
            } else if (record === 'SHEET ') {
                var startChain = line.substr(21, 1);
                var startResi = parseInt(line.substr(22, 4));
                //var endChain = line.substr(32, 1);
                var endResi = parseInt(line.substr(33, 4));

                for(var j = startResi; j <= endResi; ++j) {
                  var chain_resi = startChain + "_" + j;
                  sheetArray.push(chain_resi);

                  if(j === startResi) sheetStart.push(chain_resi);
                  if(j === endResi) sheetEnd.push(chain_resi);
                }

                sheets.push({
                    chain: startChain,
                    initialResidue: startResi,
                    initialInscode: line.substr(26, 1),
                    terminalResidue: endResi,
                    terminalInscode: line.substr(37, 1),
                });

            } else if (record === 'HBOND ') {
                //HBOND A 1536   N2 A   59  ND2  -19.130  83.151  52.266 -18.079  81.613  49.427    3.40
                bCalculateHbond = false;

                var ligandChain = line.substr(6, 1);
                var ligandResi = line.substr(8, 4).replace(/ /g, "");
                var ligandAtom = line.substr(14, 4).replace(/ /g, "");
                var proteinChain = line.substr(18, 1);
                var proteinResi = line.substr(20, 4).replace(/ /g, "");
                var proteinAtom = line.substr(25, 4).replace(/ /g, "");

                var ligand_x = parseFloat(line.substr(30, 8));
                var ligand_y = parseFloat(line.substr(38, 8));
                var ligand_z = parseFloat(line.substr(46, 8));
                var protein_x = parseFloat(line.substr(54, 8));
                var protein_y = parseFloat(line.substr(62, 8));
                var protein_z = parseFloat(line.substr(70, 8));

                var dist = line.substr(78, 8).replace(/ /g, "");

                this.hbondpoints.push(new THREE.Vector3(ligand_x, ligand_y, ligand_z));
                this.hbondpoints.push(new THREE.Vector3(protein_x, protein_y, protein_z));
            } else if (record === 'REMARK') { // from GLMol
                 var type = parseInt(line.substr(7, 3));
                 if (type == 350 && line.substr(13, 5) == 'BIOMT') {
                    var n = parseInt(line[18]) - 1;
                    var m = parseInt(line.substr(21, 2));
                    if (this.biomtMatrices[m] == undefined) this.biomtMatrices[m] = new THREE.Matrix4().identity();
                    this.biomtMatrices[m].elements[n] = parseFloat(line.substr(24, 9));
                    this.biomtMatrices[m].elements[n + 4] = parseFloat(line.substr(34, 9));
                    this.biomtMatrices[m].elements[n + 8] = parseFloat(line.substr(44, 9));
                    this.biomtMatrices[m].elements[n + 12] = parseFloat(line.substr(54, 10));
                 }
            } else if (record === 'ENDMDL') {
                ++moleculeNum;
            } else if (record === 'JRNL  ') {
                if(line.substr(12, 4) === 'PMID') {
                    this.pmid = line.substr(19).trim();
                }
            } else if (record === 'ATOM  ' || record === 'HETATM') {
                var alt = line.substr(16, 1);
                //if (alt === "B") continue;

                // "CA" has to appear before "O". Otherwise the cartoon of secondary structure will have breaks
                // Concatenation of two pdbs will have several atoms for the same serial
                ++serial;

                var serial2 = parseInt(line.substr(6, 5));
                oriSerial2NewSerial[serial2] = serial;

                var elem = line.substr(76, 2).replace(/ /g, "");
                if (elem === '') { // for some incorrect PDB files
                   elem = line.substr(12, 2).replace(/ /g,"");
                }

                var chain = line.substr(21, 1);
                if(chain === '') chain = 1;

                var resi = parseInt(line.substr(22, 4));
                var atom = line.substr(12, 4).replace(/ /g, '');
                var chain_resi = chain + "_" + resi;

                var x = parseFloat(line.substr(30, 8));
                var y = parseFloat(line.substr(38, 8));
                var z = parseFloat(line.substr(46, 8));
                var resn = line.substr(17, 3);
                var coord = new THREE.Vector3(x, y, z);

                var atomDetails = {
                    het: record[0] === 'H', // optional, used to determine ligands, water, ions, etc
                    serial: serial,         // required, unique atom id
                    name: atom,             // required, atom name
                    alt: alt,               // optional, some alternative coordinates
                    resn: resn,             // optional, used to determine protein or nucleotide
                    structure: moleculeNum,   // optional, used to identify structure
                    chain: chain,           // optional, used to identify chain
                    resi: resi,             // optional, used to identify residue ID
                    //insc: line.substr(26, 1),
                    coord: coord,           // required, used to draw 3D shape
                    b: parseFloat(line.substr(60, 8)), // optional, used to draw B-factor tube
                    elem: elem,             // optional, used to determine hydrogen bond
                    bonds: [],              // required, used to connect atoms
                    ss: 'coil',             // optional, used to show secondary structures
                    ssbegin: false,         // optional, used to show the beginning of secondary structures
                    ssend: false            // optional, used to show the end of secondary structures
                };

                this.atoms[serial] = atomDetails;

                this.displayAtoms[serial] = 1;
                this.highlightAtoms[serial] = 1;

                // Assign secondary structures from the input
                if($.inArray(chain_resi, helixArray) !== -1) {
                  this.atoms[serial].ss = 'helix';

                  if($.inArray(chain_resi, helixStart) !== -1) {
                    this.atoms[serial].ssbegin = true;
                  }

                  // do not use else if. Some residues are both start and end of secondary structure
                  if($.inArray(chain_resi, helixEnd) !== -1) {
                    this.atoms[serial].ssend = true;
                  }
                }
                else if($.inArray(chain_resi, sheetArray) !== -1) {
                  this.atoms[serial].ss = 'sheet';

                  if($.inArray(chain_resi, sheetStart) !== -1) {
                    this.atoms[serial].ssbegin = true;
                  }

                  // do not use else if. Some residues are both start and end of secondary structure
                  if($.inArray(chain_resi, sheetEnd) !== -1) {
                    this.atoms[serial].ssend = true;
                  }
                }

                chainNum = moleculeNum + "_" + chain;
                residueNum = chainNum + "_" + resi;

                var secondarys = '-';
                if(this.atoms[serial].ss === 'helix') {
                    secondarys = 'H';
                }
                else if(this.atoms[serial].ss === 'sheet') {
                    secondarys = 'E';
                }
                else if(!this.atoms[serial].het) {
                    secondarys = 'C';
                }

                this.secondarys[residueNum] = secondarys;

                // different residue
                if(residueNum !== prevResidueNum) {
                    var residue = this.residueName2Abbr(resn);

                    this.residueId2Name[residueNum] = residue;

                    if(serial !== 1) this.residues[prevResidueNum] = residuesTmp;
                    residuesTmp = {};

                    // different chain
                    if(chainNum !== prevChainNum) {
                        // a chain could be separated in two sections
                        if(serial !== 1) this.chains[prevChainNum] = this.unionHash2Atoms(this.chains[prevChainNum], chainsTmp);
                        chainsTmp = {};

                        if(this.structures[moleculeNum.toString()] === undefined) this.structures[moleculeNum.toString()] = [];
                        this.structures[moleculeNum.toString()].push(chainNum);

                        if(this.chainsSeq[chainNum] === undefined) this.chainsSeq[chainNum] = [];
                        if(this.chainsAnno[chainNum] === undefined ) this.chainsAnno[chainNum] = [];
                        if(this.chainsAnno[chainNum][0] === undefined ) this.chainsAnno[chainNum][0] = [];
                        if(this.chainsAnno[chainNum][1] === undefined ) this.chainsAnno[chainNum][1] = [];
                        if(this.chainsAnnoTitle[chainNum] === undefined ) this.chainsAnnoTitle[chainNum] = [];
                        if(this.chainsAnnoTitle[chainNum][0] === undefined ) this.chainsAnnoTitle[chainNum][0] = [];
                        if(this.chainsAnnoTitle[chainNum][1] === undefined ) this.chainsAnnoTitle[chainNum][1] = [];

                          var resObject = {};
                          resObject.resi = resi;
                          resObject.name = residue;

                        this.chainsSeq[chainNum].push(resObject);

                          var numberStr = '';
                          if(resi % 10 === 0) numberStr = resi.toString();

                        this.chainsAnno[chainNum][0].push(numberStr);
                        this.chainsAnno[chainNum][1].push(secondarys);
                        this.chainsAnnoTitle[chainNum][0].push("");
                        this.chainsAnnoTitle[chainNum][1].push("SS");
                    }
                    else {
                          var resObject = {};
                          resObject.resi = resi;
                          resObject.name = residue;

                        this.chainsSeq[chainNum].push(resObject);

                          var numberStr = '';
                          if(resi % 10 === 0) numberStr = resi.toString();

                        this.chainsAnno[chainNum][0].push(numberStr);
                        this.chainsAnno[chainNum][1].push(secondarys);
                    }
                }

                //structuresTmp[serial] = 1;
                chainsTmp[serial] = 1;
                residuesTmp[serial] = 1;

                prevRecord = record;

                prevChainNum = chainNum;
                prevResidueNum = residueNum;

            } else if (record === 'CONECT') {
                var from = parseInt(line.substr(6, 5));
                for (var j = 0; j < 4; ++j) {
                    var to = parseInt(line.substr([11, 16, 21, 26][j], 5));
                    if (isNaN(to)) continue;

                    //this.atoms[from].bonds.push(this.atoms[to].serial);
                    if(this.atoms[oriSerial2NewSerial[from]] !== undefined) this.atoms[oriSerial2NewSerial[from]].bonds.push(oriSerial2NewSerial[to]);
                }
            } else if (record === 'TER   ') {
                // Concatenation of two pdbs will have several atoms for the same serial
                ++serial;

                //this.lastTerSerial = parseInt(line.substr(6, 5));
            }
        }

        // remove the reference
        lines = null;

        // add the last residue set
        var residue = this.residueName2Abbr(resn);

        this.chains[chainNum] = chainsTmp;
        this.residues[residueNum] = residuesTmp;

        var curChain, curResi, curInsc, curResAtoms = [], me = this;
        var refreshBonds = function (f) {
            var n = curResAtoms.length;
            for (var j = 0; j < n; ++j) {
                var atom0 = curResAtoms[j];
                for (var k = j + 1; k < n; ++k) {
                    var atom1 = curResAtoms[k];
                    if (atom0.alt === atom1.alt && me.hasCovalentBond(atom0, atom1)) {
                    //if (me.hasCovalentBond(atom0, atom1)) {
                        atom0.bonds.push(atom1.serial);
                        atom1.bonds.push(atom0.serial);
                    }
                }
                f && f(atom0);
            }
        };
        var pmin = new THREE.Vector3( 9999, 9999, 9999);
        var pmax = new THREE.Vector3(-9999,-9999,-9999);
        var psum = new THREE.Vector3();
        var cnt = 0;
        // assign atoms
        for (var i in this.atoms) {
            var atom = this.atoms[i];
            var coord = atom.coord;
            psum.add(coord);
            pmin.min(coord);
            pmax.max(coord);
            ++cnt;

            if(!atom.het) {
              if($.inArray(atom.resn, this.nucleotidesArray) !== -1) {
                this.nucleotides[atom.serial] = 1;
                if (atom.name === 'P') this.nucleotidesP[atom.serial] = 1;
              }
              else {
                this.peptides[atom.serial] = 1;
                if (atom.name === 'CA') this.calphas[atom.serial] = 1;
              }
            }
            else if(atom.het) {
              if(atom.resn === 'HOH' || atom.resn === 'WAT') {
                this.water[atom.serial] = 1;
              }
              else if($.inArray(atom.resn, this.ionsArray) !== -1) {
                this.ions[atom.serial] = 1;
              }
              else {
                this.ligands[atom.serial] = 1;
              }
            }

            //if (!(curChain === atom.chain && curResi === atom.resi && curInsc === atom.insc)) {
            if (!(curChain === atom.chain && curResi === atom.resi)) {
                refreshBonds(function (atom0) {
                    if (((atom0.name === 'C' && atom.name === 'N') || (atom0.name === 'O3\'' && atom.name === 'P')) && me.hasCovalentBond(atom0, atom)) {
                        atom0.bonds.push(atom.serial);
                        atom.bonds.push(atom0.serial);
                    }
                });
                curChain = atom.chain;
                curResi = atom.resi;
                //curInsc = atom.insc;
                curResAtoms.length = 0;
            }
            curResAtoms.push(atom);
        } // end of for

        refreshBonds();

        this.pmin = pmin;
        this.pmax = pmax;
        //this.psum = psum;

        this.cnt = cnt;

        this.maxD = this.pmax.distanceTo(this.pmin);
        this.center = psum.multiplyScalar(1.0 / this.cnt);

        if (this.maxD < 25) this.maxD = 25;
    },

    cloneHash: function(from, to) {
      for(var i in from) {
        to[i] = from[i];
      }
    },

    residueName2Abbr: function(residueName) {
      if(residueName !== undefined && residueName.charAt(0) !== ' ' && residueName.charAt(1) === ' ') {
        //residueName = 'n' + residueName.charAt(0);
        residueName = residueName.charAt(0);
      }

      switch(residueName) {
        case '  A':
          //return 'nA';
          return 'A';
          break;
        case '  C':
          //return 'nC';
          return 'C';
          break;
        case '  G':
          //return 'nG';
          return 'G';
          break;
        case '  T':
          //return 'nT';
          return 'T';
          break;
        case '  U':
          //return 'nU';
          return 'U';
          break;
        case '  I':
          //return 'nI';
          return 'I';
          break;
        case 'ALA':
          return 'A';
          break;
        case 'ARG':
          return 'R';
          break;
        case 'ASN':
          return 'N';
          break;
        case 'ASP':
          return 'D';
          break;
        case 'CYS':
          return 'C';
          break;
        case 'GLU':
          return 'E';
          break;
        case 'GLN':
          return 'Q';
          break;
        case 'GLY':
          return 'G';
          break;
        case 'HIS':
          return 'H';
          break;
        case 'ILE':
          return 'I';
          break;
        case 'LEU':
          return 'L';
          break;
        case 'LYS':
          return 'K';
          break;
        case 'MET':
          return 'M';
          break;
        case 'PHE':
          return 'F';
          break;
        case 'PRO':
          return 'P';
          break;
        case 'SER':
          return 'S';
          break;
        case 'THR':
          return 'T';
          break;
        case 'TRP':
          return 'W';
          break;
        case 'TYR':
          return 'Y';
          break;
        case 'VAL':
          return 'V';
          break;
        case 'SEC':
          return 'U';
          break;
        case 'PYL':
          return 'O';
          break;

        default:
          return residueName;
      }
    },

    // get hbonds between "molecule" and "ligand"
    calculateLigandHbonds: function (molecule, ligands, threshold) {
        if(Object.keys(molecule).length === 0 || Object.keys(ligands).length === 0) return;

        var atomHbond = {};
        var chain_resi_atom;

        var maxlengthSq = threshold * threshold;

        for (var i in molecule) {
          var atom = molecule[i];

          if(atom.elem === "N" || atom.elem === "O" || atom.elem === "F") { // calculate hydrogen bond
            chain_resi_atom = atom.structure + "_" + atom.chain + "_" + atom.resi + "_" + atom.name;

            atomHbond[chain_resi_atom] = atom;
          }
        } // end of for (var i in molecule) {

        this.highlightAtoms = {};

        for (var i in ligands) {
          var atom = ligands[i];

          if(atom.elem === "N" || atom.elem === "O" || atom.elem === "F") { // calculate hydrogen bond
            chain_resi_atom = atom.structure + "_" + atom.chain + "_" + atom.resi + "_" + atom.name;

            for (var j in atomHbond) {
              var xdiff = Math.abs(atom.coord.x - atomHbond[j].coord.x);
              if(xdiff > threshold) continue;

              var ydiff = Math.abs(atom.coord.y - atomHbond[j].coord.y);
              if(ydiff > threshold) continue;

              var zdiff = Math.abs(atom.coord.z - atomHbond[j].coord.z);
              if(zdiff > threshold) continue;

              var dist = xdiff * xdiff + ydiff * ydiff + zdiff * zdiff;
              if(dist > maxlengthSq) continue;

              // output hydrogen bonds
              var other_chain_resi_atom = j.split('_');

              // remove those hydrogen bonds in the same residue
              //if(parseInt(atom.resi) !== parseInt(other_chain_resi_atom[2])) {
                this.hbondpoints.push(atom.coord);
                this.hbondpoints.push(atomHbond[j].coord);

                for(var k in this.residues[other_chain_resi_atom[0] + "_" + other_chain_resi_atom[1] + "_" + other_chain_resi_atom[2]]) {
                  //if(!this.atoms[i].het) {
                    //this.atoms[i].style = 'sphere';

                    this.highlightAtoms[k] = 1;
                  //}
                }
              //}
            } // end of for (var j in atomHbond) {

            //atomHbond[chain_resi_atom] = atom;
          }
        } // end of for (var i in ligands) {
    },

    createSphere: function (atom, defaultRadius, forceDefault, scale, bHighlight) {
        var mesh;

        if(defaultRadius === undefined) defaultRadius = 0.8;
        if(forceDefault === undefined) forceDefault = false;
        if(scale === undefined) scale = 1.0;

        if(bHighlight === 2) {
          if(scale > 0.9) { // sphere
            scale = 1.5;
          }
          else if(scale < 0.5) { // dot
            scale = 1.0;
            }
          var color = this.highlightColor;

          mesh = new THREE.Mesh(this.sphereGeometry, new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.5, metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, color: color }));
        }
        else if(bHighlight === 1) {
          mesh = new THREE.Mesh(this.sphereGeometry, this.matShader);
        }
        else {
          var color = atom.color;

          mesh = new THREE.Mesh(this.sphereGeometry, new THREE.MeshPhongMaterial({ metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, color: color }));
        }

        mesh.scale.x = mesh.scale.y = mesh.scale.z = forceDefault ? defaultRadius : (this.vdwRadii[atom.elem] || defaultRadius) * (scale ? scale : 1);
        mesh.position.copy(atom.coord);
        this.mdl.add(mesh);
        if(bHighlight === 1 || bHighlight === 2) {
            this.prevHighlightObjects.push(mesh);
        }
        else {
            this.objects.push(mesh);
        }
    },

    // used for highlight
    createBox: function (atom, defaultRadius, forceDefault, scale, color, bHighlight) {
        var mesh;

        if(defaultRadius === undefined) defaultRadius = 0.8;
        if(forceDefault === undefined) forceDefault = false;
        if(scale === undefined) scale = 0.8;

        if(bHighlight) {
            if(color === undefined) color = this.highlightColor;

              mesh = new THREE.Mesh(this.boxGeometry, new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.5, metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, color: color }));
        }
        else {
            if(color === undefined) color = atom.color;

              mesh = new THREE.Mesh(this.boxGeometry, new THREE.MeshPhongMaterial({ metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, color: color }));
        }

        mesh.scale.x = mesh.scale.y = mesh.scale.z = forceDefault ? defaultRadius : (this.vdwRadii[atom.elem] || defaultRadius) * (scale ? scale : 1);
        mesh.position.copy(atom.coord);
        this.mdl.add(mesh);

        if(bHighlight) {
            this.prevHighlightObjects.push(mesh);
        }
        else {
            this.objects.push(mesh);
        }
    },

    createCylinder: function (p0, p1, radius, color, bHighlight) {

        var mesh;

        if(bHighlight === 2) {
          mesh = new THREE.Mesh(this.cylinderGeometry, new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.5, metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, color: color }));

          radius *= 1.5;
        }
        else if(bHighlight === 1) {
          mesh = new THREE.Mesh(this.cylinderGeometryOutline, this.matShader);
          //mesh = new THREE.Mesh(this.cylinderGeometry, this.matShader);
        }
        else {
          mesh = new THREE.Mesh(this.cylinderGeometry, new THREE.MeshPhongMaterial({ metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, color: color }));
        }

        mesh.position.copy(p0).add(p1).multiplyScalar(0.5);
        mesh.matrixAutoUpdate = false;
        mesh.lookAt(p0);
        mesh.updateMatrix();

        mesh.matrix.multiply(new THREE.Matrix4().makeScale(radius, radius, p0.distanceTo(p1))).multiply(new THREE.Matrix4().makeRotationX(Math.PI * 0.5));
        this.mdl.add(mesh);
        if(bHighlight === 1 || bHighlight === 2) {
            this.prevHighlightObjects.push(mesh);
        }
        else {
            this.objects.push(mesh);
        }
    },

    createRepresentationSub: function (atoms, f0, f01) {
        var ged = new THREE.Geometry();
        for (var i in atoms) {
            var atom0 = atoms[i];
            f0 && f0(atom0);
            for (var j in atom0.bonds) {
                var atom1 = this.atoms[atom0.bonds[j]];
                if (atom1 === undefined || atom1.serial < atom0.serial) continue;

                f01 && f01(atom0, atom1);
            }
        }
    },

    createSphereRepresentation: function (atoms, defaultRadius, forceDefault, scale, bHighlight) {
        var me = this;
        this.createRepresentationSub(atoms, function (atom0) {
            me.createSphere(atom0, defaultRadius, forceDefault, scale, bHighlight);
        });
    },

    createBoxRepresentation_P_CA: function (atoms, scale, bHighlight) {
        var me = this;
        this.createRepresentationSub(atoms, function (atom0) {
            if(atom0.name === 'CA' || atom0.name === 'P') {
                me.createBox(atom0, undefined, undefined, scale, undefined, bHighlight);
            }
        });
    },

    createStickRepresentation: function (atoms, atomR, bondR, scale, bHighlight) {
        var me = this;

        if(bHighlight !== 2) {
            this.createRepresentationSub(atoms, function (atom0) {
                me.createSphere(atom0, atomR, !scale, scale, bHighlight);
            }, function (atom0, atom1) {
                if (atom0.color === atom1.color) {
                    me.createCylinder(atom0.coord, atom1.coord, bondR, atom0.color, bHighlight);
                } else {
                    var mp = atom0.coord.clone().add(atom1.coord).multiplyScalar(0.5);
                    me.createCylinder(atom0.coord, mp, bondR, atom0.color, bHighlight);
                    me.createCylinder(atom1.coord, mp, bondR, atom1.color, bHighlight);
                }
            });
        }
        else if(bHighlight === 2) {
            this.createBoxRepresentation_P_CA(atoms, 1.2, bHighlight);
        }
    },

    createLineRepresentation: function (atoms, bHighlight) {
        var me = this;
        var geo = new THREE.Geometry();
        this.createRepresentationSub(atoms, undefined, function (atom0, atom1) {
            if (atom0.color === atom1.color) {
                geo.vertices.push(atom0.coord);
                geo.vertices.push(atom1.coord);
                geo.colors.push(atom0.color);
                geo.colors.push(atom1.color);
            } else {
                var mp = atom0.coord.clone().add(atom1.coord).multiplyScalar(0.5);
                geo.vertices.push(atom0.coord);
                geo.vertices.push(mp);
                geo.vertices.push(atom1.coord);
                geo.vertices.push(mp);
                geo.colors.push(atom0.color);
                geo.colors.push(atom0.color);
                geo.colors.push(atom1.color);
                geo.colors.push(atom1.color);
            }
        });

        if(bHighlight !== 2) {
            var line;
            if(bHighlight === 1) {
                // outline didn't work for lines
                //line = new THREE.Mesh(geo, this.matShader);
            }
            else {
                line = new THREE.Line(geo, new THREE.LineBasicMaterial({ linewidth: this.linewidth, vertexColors: true }), THREE.LinePieces);
            }

            this.mdl.add(line);

            if(bHighlight === 1) {
                this.prevHighlightObjects.push(line);
            }
            else {
                this.objects.push(line);
            }
        }
        else if(bHighlight === 2) {
            this.createBoxRepresentation_P_CA(atoms, 0.8, bHighlight);
        }
    },

    subdivide: function (_points, DIV, bShowArray, bHighlight) { // Catmull-Rom subdivision
        var ret = [];

        var points = new Array(); // Smoothing test
        points.push(_points[0]);
        for (var i = 1, lim = _points.length - 1; i < lim; ++i) {
            var p0 = _points[i], p1 = _points[i + 1];
            points.push(p0.smoothen ? p0.clone().add(p1).multiplyScalar(0.5) : p0);
        }
        points.push(_points[_points.length - 1]);

        var savedPoints = [];
        for (var i = -1, size = points.length, DIVINV = 1 / DIV; i <= size - 3; ++i) {
            var p0 = points[i === -1 ? 0 : i];
            var p1 = points[i + 1], p2 = points[i + 2];
            var p3 = points[i === size - 3 ? size - 1 : i + 3];
            var v0 = p2.clone().sub(p0).multiplyScalar(0.5);
            var v1 = p3.clone().sub(p1).multiplyScalar(0.5);

            if(i > -1 && bHighlight && bShowArray !== undefined && bShowArray[i + 1]) {
                // get from previous i for the first half of residue
                ret = ret.concat(savedPoints);
            }

            savedPoints = [];

            for (var j = 0; j < DIV; ++j) {
                var t = DIVINV * j;
                var x = p1.x + t * v0.x
                         + t * t * (-3 * p1.x + 3 * p2.x - 2 * v0.x - v1.x)
                         + t * t * t * (2 * p1.x - 2 * p2.x + v0.x + v1.x);
                var y = p1.y + t * v0.y
                         + t * t * (-3 * p1.y + 3 * p2.y - 2 * v0.y - v1.y)
                         + t * t * t * (2 * p1.y - 2 * p2.y + v0.y + v1.y);
                var z = p1.z + t * v0.z
                         + t * t * (-3 * p1.z + 3 * p2.z - 2 * v0.z - v1.z)
                         + t * t * t * (2 * p1.z - 2 * p2.z + v0.z + v1.z);
                if(!bShowArray) {
                    ret.push(new THREE.Vector3(x, y, z));
                }
                else if(bShowArray[i + 1]) {
                    if(j <= parseInt((DIV + 1) / 2) ) {
                        ret.push(new THREE.Vector3(x, y, z));
                    }
                }
                else if(bShowArray[i + 2]) {
                    if(j >= parseInt((DIV + 1) / 2) ) {
                        savedPoints.push(new THREE.Vector3(x, y, z));
                    }
                }
            }
        }
        if(!bShowArray || bShowArray[i + 1]) {
            if(bHighlight) {
                ret = ret.concat(savedPoints);
            }

            ret.push(points[points.length - 1]);
        }

        return ret;
    },

    createCurveSubArrow: function (p, width, colors, div, bHighlight, bRibbon, num, positionIndex, pointsCA, prevCOArray, bShowArray) {
        var divPoints = [], positions = [];

        divPoints.push(p);
        positions.push(positionIndex);

        this.prepareStrand(divPoints, positions, width, colors, div, undefined, bHighlight, bRibbon, num, pointsCA, prevCOArray, false, bShowArray);
    },

    createCurveSub: function (_points, width, colors, div, bHighlight, bRibbon, bNoSmoothen, bShowArray) {
        if (_points.length === 0) return;
        div = div || 5;
        var points;
        if(!bNoSmoothen) {
            points = this.subdivide(_points, div, bShowArray, bHighlight);
        }
        else {
            points = _points;
        }
        if (points.length === 0) return;

        var geo = new THREE.Geometry();

        if(bHighlight === 2 && bRibbon) {
            for (var i = 0, divInv = 1 / div; i < points.length; ++i) {
                // shift the highlight a little bit to avoid the overlap with ribbon
                points[i].addScalar(0.6); // this.thickness is 0.4
                geo.vertices.push(points[i]);
                geo.colors.push(new THREE.Color(colors[i === 0 ? 0 : Math.round((i - 1) * divInv)]));
            }
        }
        else if(bHighlight === 1) {
            var radius = this.coilWidth / 2;
            var radiusSegments = 32;
            var closed = false;

            if(points.length > 1) {
                var geometry0 = new THREE.TubeGeometry(
                    new THREE.SplineCurve3(points), // path
                    points.length, // segments
                    radius,
                    radiusSegments,
                    closed
                );

                mesh = new THREE.Mesh(geometry0, this.matShader);
                //mesh.material.depthTest = true;
                //mesh.material.depthWrite = false;
                this.mdl.add(mesh);

                this.prevHighlightObjects.push(mesh);
            }
        }
        else {
            for (var i = 0, divInv = 1 / div; i < points.length; ++i) {
                geo.vertices.push(points[i]);
                geo.colors.push(new THREE.Color(colors[i === 0 ? 0 : Math.round((i - 1) * divInv)]));
            }
        }

        var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ linewidth: width, vertexColors: true }), THREE.LineStrip);
        this.mdl.add(line);
        if(bHighlight === 2) {
            this.prevHighlightObjects.push(line);
        }
        else {
            this.objects.push(line);
        }
    },

    createLines: function(lines) { // show extra lines, not used for picking, so no this.objects
       if(lines !== undefined) {
         for(var i in lines) {
           var line = lines[i];

           var p1 = line.position1;
           var p2 = line.position2;

           var colorHex;
           if(line.color) { // #FF0000
              var color = /^\#([0-9a-f]{6})$/i.exec( line.color );
              colorHex = parseInt( color[ 1 ], 16 );
           }
           else {
              colorHex = 0xffff00;
           }

           var dashed = (line.dashed) ? line.dashed : false;
           var dashSize = 0.3;

           this.mdl.add(this.createSingleLine( p1, p2, colorHex, dashed, dashSize ));
         }
       }

       // do not add the artificial lines to raycasting objects
    },

/*
    createCurve: function (atoms, curveWidth, atomName, div) {
        var points = [], colors = [];
        var currentChain, currentResi;
        div = div || 5;
        for (var i in atoms) {
            var atom = atoms[i];
            if (atom.name === atomName && !atom.het) {
                if (currentChain !== atom.chain || currentResi + 1 !== atom.resi) {
                    this.createCurveSub(points, curveWidth, colors, div);
                    points = [];
                    colors = [];
                }
                points.push(atom.coord);
                colors.push(atom.color);
                currentChain = atom.chain;
                currentResi = atom.resi;
            }
        }
        this.createCurveSub(points, curveWidth, colors, div);
    },
*/

    createCylinderCurve: function (atoms, atomName, radius, bLines, bHighlight) {
        var start = null;
        var currentChain, currentResi;
        var i;
        var points = [], colors = [], radii = [];
        for (i in atoms) {
            var atom = atoms[i];
            if (atom.het) continue;
            if (atom.name !== atomName) continue;

            if (start !== null && currentChain === atom.chain && currentResi + 1 === atom.resi) {
                if(!bHighlight) {
                    if(bLines) {
                        var line = this.createSingleLine( start.coord, atom.coord, atom.color, false);
                        this.mdl.add(line);
                        this.objects.push(line);
                    }
                    else {
                        this.createCylinder(start.coord, atom.coord, radius, atom.color);
                        this.createSphere(atom, radius, true, 1);
                    }
                }
                else if(bHighlight === 1) {
                    this.createCylinder(start.coord, atom.coord, radius, atom.color, bHighlight);
                    this.createSphere(atom, radius, true, 1, bHighlight);
                }
            }

            start = atom;
            currentChain = atom.chain;
            currentResi = atom.resi;

            if(bHighlight === 2) this.createBox(atom, undefined, undefined, undefined, undefined, bHighlight);
        }
        if (start !== null && currentChain === atom.chain && currentResi + 1 === atom.resi) {
            if(!bHighlight) {
                if(bLines) {
                    var line = this.createSingleLine( start.coord, atom.coord, atom.color, false);
                    this.mdl.add(line);
                    this.objects.push(line);
                }
                else {
                    this.createCylinder(start.coord, atom.coord, radius, atom.color);
                }
            }
            else if(bHighlight === 1) {
                this.createCylinder(start.coord, atom.coord, radius, atom.color, bHighlight);
                this.createSphere(atom, radius, true, 1, bHighlight);
            }
        }
    },

    prepareStrand: function(divPoints, positions, width, colors, div, thickness, bHighlight, bRibbon, num, pointsCA, prevCOArray, bStrip, bShowArray) {
        if(pointsCA.length === 1) {
            return;
        }

        div = div || this.axisDIV;
        var numM1Inv2 = 2 / (num - 1);
        var delta, lastCAIndex, lastPrevCOIndex, v;

        var points = {}, colorsTmp = [];
        for(var i = 0, il = positions.length; i < il; ++i) points[i] = [];

        // smooth C-alpha
        var pointsCASmooth = this.subdivide(pointsCA, div); // get all smoothen points, do not use 'bShowArray'
        if(pointsCASmooth.length === 1) {
            return;
        }

        // draw the sheet without the last residue
        // use the sheet coord for n-2 residues
        for (var i = 0, il = pointsCA.length - 2; i < il; ++i) {
            for(var index = 0, indexl = positions.length; index < indexl; ++index) {
                points[index].push(divPoints[index][i]);
            }
            colorsTmp.push(colors[i]);
        }
        colorsTmp.push(colors[i]);

        // assign the sheet coord from C-alpha for the 2nd to the last residue of the sheet
        for(var i = 0, il = positions.length; i < il; ++i) {
            delta = -1 + numM1Inv2 * positions[i];
            lastCAIndex = pointsCASmooth.length - 1 - div;
            lastPrevCOIndex = pointsCA.length - 2;
            v = new THREE.Vector3(pointsCASmooth[lastCAIndex].x + prevCOArray[lastPrevCOIndex].x * delta, pointsCASmooth[lastCAIndex].y + prevCOArray[lastPrevCOIndex].y * delta, pointsCASmooth[lastCAIndex].z + prevCOArray[lastPrevCOIndex].z * delta);
            points[i].push(v);
        }

        for(var i = 0, il = positions.length; i < il; ++i) {
            points[i] = this.subdivide(points[i], div, bShowArray, bHighlight);
        }

        if(bStrip) {
            this.createStrip(points[0], points[1], colorsTmp, div, thickness, bHighlight, true);
        }
        else {
            this.createCurveSub(points[0], width, colorsTmp, div, bHighlight, bRibbon, true);
        }

        // draw the arrow
        for(var i = 0, il = positions.length; i < il; ++i) points[i] = [];
        colorsTmp = [];

        for(var index = 0, indexl = positions.length; index < indexl; ++index) {
            for (var i = div * (pointsCA.length - 2), il = div * (pointsCA.length - 1); bShowArray[parseInt(i/div)] && i < il; i = i + div) {
                for (var j = 0; j < div; ++j) {
                    var delta = -1 + numM1Inv2 * positions[index];
                    var scale = 1.8; // scale of the arrow width
                    delta = delta * scale * (div - j) / div;
                    var oriIndex = parseInt(i/div);

                    var v = new THREE.Vector3(pointsCASmooth[i+j].x + prevCOArray[oriIndex].x * delta, pointsCASmooth[i+j].y + prevCOArray[oriIndex].y * delta, pointsCASmooth[i+j].z + prevCOArray[oriIndex].z * delta);
                    v.smoothen = true;
                    points[index].push(v);
                }
            }

            // last residue
            //var delta = -1 + numM1Inv2 * positions[index];
            // make the arrow end with 0
            var delta = 0;
            var lastCAIndex = pointsCASmooth.length - 1;
            var lastPrevCOIndex = pointsCA.length - 1;

            //if(bShowArray[lastPrevCOIndex]) {
                var v = new THREE.Vector3(pointsCASmooth[lastCAIndex].x + prevCOArray[lastPrevCOIndex].x * delta, pointsCASmooth[lastCAIndex].y + prevCOArray[lastPrevCOIndex].y * delta, pointsCASmooth[lastCAIndex].z + prevCOArray[lastPrevCOIndex].z * delta);
                v.smoothen = true;
                points[index].push(v);
            //}
        }

        colorsTmp.push(colors[colors.length - 2]);
        colorsTmp.push(colors[colors.length - 1]);

        if(bStrip) {
            this.createStrip(points[0], points[1], colorsTmp, div, thickness, bHighlight, true);
        }
        else {
            this.createCurveSub(points[0], width, colorsTmp, div, bHighlight, bRibbon, true);
        }
    },

    createStripArrow: function (p0, p1, colors, div, thickness, bHighlight, num, start, end, pointsCA, prevCOArray, bShowArray) {
        var divPoints = [], positions = [];

        divPoints.push(p0);
        divPoints.push(p1);
        positions.push(start);
        positions.push(end);

        this.prepareStrand(divPoints, positions, undefined, colors, div, thickness, bHighlight, undefined, num, pointsCA, prevCOArray, true, bShowArray);
    },

    createStrip: function (p0, p1, colors, div, thickness, bHighlight, bNoSmoothen, bShowArray) {
        if (p0.length < 2) return;
        div = div || this.axisDIV;
        if(!bNoSmoothen) {
            p0 = this.subdivide(p0, div, bShowArray, bHighlight);
            p1 = this.subdivide(p1, div, bShowArray, bHighlight);
        }
        if (p0.length < 2) return;

        var geo = new THREE.Geometry();
        var vs = geo.vertices, fs = geo.faces;
        var axis, p0v, p1v, a0v, a1v;
        for (var i = 0, lim = p0.length; i < lim; ++i) {
            vs.push(p0v = p0[i]); // 0
            vs.push(p0v); // 1
            vs.push(p1v = p1[i]); // 2
            vs.push(p1v); // 3
            if (i < lim - 1) {
                axis = p1[i].clone().sub(p0[i]).cross(p0[i + 1].clone().sub(p0[i])).normalize().multiplyScalar(thickness);
            }
            vs.push(a0v = p0[i].clone().add(axis)); // 4
            vs.push(a0v); // 5
            vs.push(a1v = p1[i].clone().add(axis)); // 6
            vs.push(a1v); // 7
        }
        var faces = [[0, 2, -6, -8], [-4, -2, 6, 4], [7, 3, -5, -1], [-3, -7, 1, 5]];
        for (var i = 1, lim = p0.length, divInv = 1 / div; i < lim; ++i) {
            var offset = 8 * i, color = new THREE.Color(colors[Math.round((i - 1) * divInv)]);
            for (var j = 0; j < 4; ++j) {
                fs.push(new THREE.Face3(offset + faces[j][0], offset + faces[j][1], offset + faces[j][2], undefined, color));
                fs.push(new THREE.Face3(offset + faces[j][3], offset + faces[j][0], offset + faces[j][2], undefined, color));
            }
        }
        var vsize = vs.length - 8; // Cap
        for (var i = 0; i < 4; ++i) {
            vs.push(vs[i * 2]);
            vs.push(vs[vsize + i * 2]);
        };
        vsize += 8;
        fs.push(new THREE.Face3(vsize, vsize + 2, vsize + 6, undefined, fs[0].color));
        fs.push(new THREE.Face3(vsize + 4, vsize, vsize + 6, undefined, fs[0].color));
        fs.push(new THREE.Face3(vsize + 1, vsize + 5, vsize + 7, undefined, fs[fs.length - 3].color));
        fs.push(new THREE.Face3(vsize + 3, vsize + 1, vsize + 7, undefined, fs[fs.length - 3].color));
        geo.computeFaceNormals();
        geo.computeVertexNormals(false);

        var mesh;

        if(bHighlight === 2) {
          mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.5, metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, vertexColors: THREE.FaceColors, side: THREE.DoubleSide }));

          this.mdl.add(mesh);
          this.prevHighlightObjects.push(mesh);
        }
        else if(bHighlight === 1) {
            //mesh = new THREE.Mesh(geo, this.matShader);

            var radius = this.coilWidth / 2;
            var radiusSegments = 32;
            var closed = false;

            // first tube
            var geometry0 = new THREE.TubeGeometry(
                new THREE.SplineCurve3(p0), // path
                p0.length, // segments
                radius,
                radiusSegments,
                closed
            );

            mesh = new THREE.Mesh(geometry0, this.matShader);
            this.mdl.add(mesh);

            this.prevHighlightObjects.push(mesh);

            // second tube
            var geometry1 = new THREE.TubeGeometry(
                new THREE.SplineCurve3(p1), // path
                p1.length, // segments
                radius,
                radiusSegments,
                closed
            );

            mesh = new THREE.Mesh(geometry1, this.matShader);
            this.mdl.add(mesh);

            this.prevHighlightObjects.push(mesh);
        }
        else {
          mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, vertexColors: THREE.FaceColors, side: THREE.DoubleSide }));

          this.mdl.add(mesh);
          this.objects.push(mesh);
        }
    },

    createBrick: function (brickArray, color) {
        var geo = new THREE.Geometry();

        // https://www.packtpub.com/books/content/working-basic-components-make-threejs-scene
        // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Creating_3D_objects_using_WebGL
        for (var i = 0, lim = brickArray.length; i < lim; ++i) {
            // brickArray: 000, 001, 010, 011, 100, 101, 110, 111
            geo.vertices.push(new THREE.Vector3(brickArray[i][0], brickArray[i][1], brickArray[i][2]));
        }

        geo.faces = [
            new THREE.Face3(1,5,7, undefined, color),
            new THREE.Face3(1,7,3, undefined, color),
            new THREE.Face3(0,2,6, undefined, color),
            new THREE.Face3(0,6,4, undefined, color),
            new THREE.Face3(2,3,7, undefined, color),
            new THREE.Face3(2,7,6, undefined, color),
            new THREE.Face3(0,4,5, undefined, color),
            new THREE.Face3(0,5,1, undefined, color),
            new THREE.Face3(4,6,7, undefined, color),
            new THREE.Face3(4,7,5, undefined, color),
            new THREE.Face3(0,1,3, undefined, color),
            new THREE.Face3(0,3,2, undefined, color)

        ];

        geo.computeFaceNormals();
        geo.computeVertexNormals(false);

        var mesh;

        mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, vertexColors: THREE.FaceColors, side: THREE.DoubleSide }));

        this.mdl.add(mesh);
        this.objects.push(mesh);
    },

    getFirstAtomObj: function(atomsHash) {
        var atomKeys = Object.keys(atomsHash);
        var firstIndex = atomKeys[0];

        return this.atoms[firstIndex];
    },

    getLastAtomObj: function(atomsHash) {
        var atomKeys = Object.keys(atomsHash);
        var lastIndex = atomKeys[atomKeys.length - 1];

        return this.atoms[lastIndex];
    },

    createStrand: function (atoms, num, div, fill, coilWidth, helixSheetWidth, doNotSmoothen, thickness, bHighlight) {
        var bRibbon = fill ? true: false;

        // when highlight, the input atoms may only include part of sheet or helix
        // include the whole sheet or helix when highlighting
        var atomsAdjust = {};
        if(bHighlight === 1 || bHighlight === 2) {
            var firstAtom = this.getFirstAtomObj(atoms);
            var lastAtom = this.getLastAtomObj(atoms);

            // fill the beginning
            var beginResi = firstAtom.resi;
            if(firstAtom.ss !== 'coil' && !(firstAtom.ssbegin) ) {
                for(var i = firstAtom.resi - 1; i > 0; --i) {
                    var residueid = firstAtom.structure + '_' + firstAtom.chain + '_' + i;
                    var atom = this.getFirstAtomObj(this.residues[residueid]);

                    if(atom.ss === firstAtom.ss && atom.ssbegin) {
                        beginResi = atom.resi;
                        break;
                    }
                }

                for(var i = beginResi; i < firstAtom.resi; ++i) {
                    var residueid = firstAtom.structure + '_' + firstAtom.chain + '_' + i;
                    atomsAdjust = this.unionHash(atomsAdjust, this.hash2Atoms(this.residues[residueid]));
                }
            }

            // fill the input atoms
            atomsAdjust = this.unionHash(atomsAdjust, atoms);

            // fill the end
            var endResi = lastAtom.resi;
            // when a coil connects to a sheet and the last residue of coild is highlighted, the first sheet residue is set as atom.notshow. This residue should not be shown.
            if(lastAtom.ss !== 'coil' && !(lastAtom.ssend) && !(lastAtom.notshow)) {
                var endChainResi = this.getLastAtomObj(this.chains[lastAtom.structure + '_' + lastAtom.chain]).resi;
                for(var i = lastAtom.resi + 1; i <= endChainResi; ++i) {
                    var residueid = lastAtom.structure + '_' + lastAtom.chain + '_' + i;
                    var atom = this.getFirstAtomObj(this.residues[residueid]);

                    if(atom.ss === lastAtom.ss && atom.ssend) {
                        endResi = atom.resi;
                        break;
                    }
                }

                for(var i = lastAtom.resi + 1; i <= endResi; ++i) {
                    var residueid = lastAtom.structure + '_' + lastAtom.chain + '_' + i;
                    atomsAdjust = this.unionHash(atomsAdjust, this.hash2Atoms(this.residues[residueid]));
                }
            }

            // reset notshow
            if(lastAtom.notshow) lastAtom.notshow = undefined;
        }
        else {
            atomsAdjust = atoms;
        }

        if(bHighlight === 2) {
            //this.createStrand(this.hash2Atoms(atomHash), null, null, null, null, null, false, undefined, bHighlight);
            //this.createStrand(this.hash2Atoms(atomHash), 2, undefined, true, undefined, undefined, false, this.thickness);
            if(fill) {
                fill = false;
                num = null;
                div = null;
                coilWidth = null;
                helixSheetWidth = null;
                thickness = undefined;
            }
            else {
                fill = true;
                num = 2;
                div = undefined;
                coilWidth = undefined;
                helixSheetWidth = undefined;
                thickness = this.thickness;
            }
        }

        num = num || this.strandDIV;
        div = div || this.axisDIV;
        coilWidth = coilWidth || this.coilWidth;
        doNotSmoothen = doNotSmoothen || false;
        helixSheetWidth = helixSheetWidth || this.helixSheetWidth;
        var points = {}; for (var k = 0; k < num; ++k) points[k] = [];
        var pointsCA = [];
        var prevCOArray = [];
        var bShowArray = [];
        var colors = [], colorsArrow = [];
        var currentChain, currentResi, currentCA = null, currentO = null, currentColor = null, prevCoorCA = null, prevCoorO = null, prevColor = null;
        var prevCO = null, ss = null, ssend = false, atomid = null, prevAtomid = null;
        var strandWidth, bSheetSegment = false, bHelixSegment = false;
        var atom, tubeAtoms = {};

        // test the first 30 atoms to see whether only C-alpha is available
        //if(!this.bCalphaOnly) {
          this.bCalphaOnly = false;

          var index = 0, testLength = 30;
          var bOtherAtoms = false;
          for(var i in atoms) {
            if(index < testLength) {
              if(atoms[i].name !== 'CA') {
                bOtherAtoms = true;
                break;
              }
            }
            else {
              break;
            }

            ++index;
          }

          if(!bOtherAtoms) {
            this.bCalphaOnly = true;
          }
        //}

        var atomsObj = this.hash2Atoms(atomsAdjust); // when highlight, draw whole beta sheet and use bShowArray to show the highlight part
        var residueHash = {};
        for(var i in atomsObj) {
            var atom = atomsObj[i];

            residueid = atom.structure + '_' + atom.chain + '_' + atom.resi;
            residueHash[residueid] = 1;
        }
        var totalResidueCount = Object.keys(residueHash).length;

        var drawnResidueCount = 0;
        for (var i in atomsAdjust) {
            atom = atomsAdjust[i];
            var atomOxygen = undefined;
            if ((atom.name === 'O' || atom.name === 'CA') && !atom.het) {
                    // "CA" has to appear before "O"

                    if (atom.name === 'CA') {
                        if ( atoms.hasOwnProperty(i) && (atom.ss === 'coil' || atom.ssend || atom.ssbegin) ) {
                            tubeAtoms[i] = atom;
                        }

                        currentCA = atom.coord.clone();
                        currentColor = atom.color;
                    }

                    if (atom.name === 'O' || (this.bCalphaOnly && atom.name === 'CA')) {
                        if(atom.name === 'O') currentO = atom.coord.clone();

                        // smoothen each coil, helix and sheet separately. The joint residue has to be included both in the previous and next segment
                        var bSameChain = true;
                        if (currentChain !== atom.chain || currentResi + 1 !== atom.resi) {
                            bSameChain = false;
                        }

                        //var bLastResidue = (drawnResidueCount === totalResidueCount - 2) ? true : false;

                        //if((atom.ssend || bLastResidue) && atom.ss === 'sheet') {
                        if(atom.ssend && atom.ss === 'sheet') {
                            bSheetSegment = true;
                        }
                        //else if((atom.ssend || bLastResidue) && atom.ss === 'helix') {
                        else if(atom.ssend && atom.ss === 'helix') {
                            bHelixSegment = true;
                        }

                        // assign the previous residue
                        if(prevCoorO) {
                            if(bHighlight === 1 || bHighlight === 2) {
                                colors.push(this.highlightColor);
                            }
                            else {
                                colors.push(prevColor);
                            }

                            if(ss !== 'coil' && atom.ss === 'coil') {
                                strandWidth = coilWidth;
                            }
                            else if(ssend && atom.ssbegin) { // a transition between two ss
                                strandWidth = coilWidth;
                            }
                            else {
                                strandWidth = (ss === 'coil') ? coilWidth : helixSheetWidth;
                            }

                            //var O = prevCoorO.clone();
                            //O.sub(prevCoorCA);
                            var O;
                            if(atom.name === 'O') {
                                O = prevCoorO.clone();
                                O.sub(prevCoorCA);
                            }
                            else if(this.bCalphaOnly && atom.name === 'CA') {
                                O = new THREE.Vector3(Math.random(),Math.random(),Math.random());
                            }

                            O.normalize(); // can be omitted for performance
                            O.multiplyScalar(strandWidth);
                            //if (prevCO !== undefined && O.dot(prevCO) < 0) O.negate();
                            if (prevCO !== null && O.dot(prevCO) < 0) O.negate();
                            prevCO = O;

                            for (var j = 0, numM1Inv2 = 2 / (num - 1); j < num; ++j) {
                                var delta = -1 + numM1Inv2 * j;
                                var v = new THREE.Vector3(prevCoorCA.x + prevCO.x * delta, prevCoorCA.y + prevCO.y * delta, prevCoorCA.z + prevCO.z * delta);
                                //if (!doNotSmoothen && ss === 'sheet') v.smoothen = true;
                                if (!doNotSmoothen && ss !== 'coil') v.smoothen = true;
                                points[j].push(v);
                            }

                            pointsCA.push(prevCoorCA);
                            prevCOArray.push(prevCO);

                            if(atoms.hasOwnProperty(prevAtomid)) {
                                bShowArray.push(true);
                            }
                            else {
                                bShowArray.push(false);
                            }

                            ++drawnResidueCount;
                        }

                        if ((atom.ssbegin || atom.ssend || (drawnResidueCount === totalResidueCount - 1) ) && points[0].length > 0 && bSameChain) {
                            // assign the current joint residue to the previous segment
                            if(bHighlight === 1 || bHighlight === 2) {
                                colors.push(this.highlightColor);
                            }
                            else {
                                colors.push(atom.color);
                            }

                            if(atom.ssend && atom.ss === 'sheet') { // current residue is the end of ss and is the end of arrow
                                //strandWidth = coilWidth;
                                strandWidth = 0; // make the arrow end sharp
                            }
                            else if(ss === 'coil' && atom.ssbegin) {
                                strandWidth = coilWidth;
                            }
                            else if(ssend && atom.ssbegin) { // current residue is the start of ss and  the previous residue is the end of ss, then use coil
                                strandWidth = coilWidth;
                            }
                            else { // use the ss from the previous residue
                                strandWidth = (atom.ss === 'coil') ? coilWidth : helixSheetWidth;
                            }

                            //var O = currentO.clone();
                            //O.sub(currentCA);

                            var O;
                            if(atom.name === 'O') {
                                O = currentO.clone();
                                O.sub(currentCA);
                            }
                            else if(this.bCalphaOnly && atom.name === 'CA') {
                                O = new THREE.Vector3(Math.random(),Math.random(),Math.random());
                            }

                            O.normalize(); // can be omitted for performance
                            O.multiplyScalar(strandWidth);
                            //if (prevCO !== undefined && O.dot(prevCO) < 0) O.negate();
                            if (prevCO !== null && O.dot(prevCO) < 0) O.negate();
                            prevCO = O;

                            for (var j = 0, numM1Inv2 = 2 / (num - 1); j < num; ++j) {
                                var delta = -1 + numM1Inv2 * j;
                                var v = new THREE.Vector3(currentCA.x + prevCO.x * delta, currentCA.y + prevCO.y * delta, currentCA.z + prevCO.z * delta);
                                if (!doNotSmoothen && ss !== 'coil') v.smoothen = true;
                                points[j].push(v);
                            }

                            atomid = atom.serial;

                            pointsCA.push(currentCA);
                            prevCOArray.push(prevCO);

                            // when a coil connects to a sheet and the last residue of coild is highlighted, the first sheet residue is set as atom.highlightStyle. This residue should not be shown.
                            //if(atoms.hasOwnProperty(atomid) && (bHighlight === 1 && !atom.notshow) ) {
                            if(atoms.hasOwnProperty(atomid)) {
                                bShowArray.push(true);
                            }
                            else {
                                bShowArray.push(false);
                            }

                            //++drawnResidueCount;

                            // draw the current segment
                            for (var j = 0; !fill && j < num; ++j) {
                                if(bSheetSegment) {
                                    this.createCurveSubArrow(points[j], 1, colors, div, bHighlight, bRibbon, num, j, pointsCA, prevCOArray, bShowArray);
                                }
                                else {
                                    this.createCurveSub(points[j], 1, colors, div, bHighlight, bRibbon, false, bShowArray);
                                }
                            }
                            if (fill) {
                                if(bSheetSegment) {
                                    var start = 0, end = num - 1;
                                    this.createStripArrow(points[0], points[num - 1], colors, div, thickness, bHighlight, num, start, end, pointsCA, prevCOArray, bShowArray);
                                }
                                // else {
                                else if(bHelixSegment) {
                                    this.createStrip(points[0], points[num - 1], colors, div, thickness, bHighlight, false, bShowArray);
                                }
                                else {
                                    if(bHighlight === 2) { // draw coils only when highlighted. if not highlighted, coils will be drawn as tubes separately
                                        this.createStrip(points[0], points[num - 1], colors, div, thickness, bHighlight, false, bShowArray);
                                    }
                                }
                            }
                            //var points = {};
                            for (var k = 0; k < num; ++k) points[k] = [];
                            colors = [];
                            pointsCA = [];
                            prevCOArray = [];
                            bShowArray = [];
                            bSheetSegment = false;
                            bHelixSegment = false;
                            //prevCO = null; ss = null; ssend = false;
                            //currentO = null;
                        } // end if (atom.ssbegin || atom.ssend)

                        // end of a chain
                        if ((currentChain !== atom.chain || currentResi + 1 !== atom.resi) && points[0].length > 0) {
                            for (var j = 0; !fill && j < num; ++j) {
                                if(bSheetSegment) {
                                    this.createCurveSubArrow(points[j], 1, colors, div, bHighlight, bRibbon, num, j, pointsCA, prevCOArray, bShowArray);
                                }
                                else if(bHelixSegment) {
                                    this.createCurveSub(points[j], 1, colors, div, bHighlight, bRibbon, false, bShowArray);
                                }
                            }
                            if (fill) {
                                if(bSheetSegment) {
                                    var start = 0, end = num - 1;
                                    this.createStripArrow(points[0], points[num - 1], colors, div, thickness, bHighlight, num, start, end, pointsCA, prevCOArray, bShowArray);
                                }
                                else if(bHelixSegment) {
                                    this.createStrip(points[0], points[num - 1], colors, div, thickness, bHighlight, false, bShowArray);
                                }
                            }

                            //var points = {};
                            for (var k = 0; k < num; ++k) points[k] = [];
                            colors = [];
                            pointsCA = [];
                            prevCOArray = [];
                            bShowArray = [];
                            bSheetSegment = false;
                            bHelixSegment = false;
                            //prevCO = null; ss = null; ssend = false;
                            //currentO = null;
                        }

                        currentChain = atom.chain;
                        currentResi = atom.resi;
                        ss = atom.ss;
                        ssend = atom.ssend;
                        prevAtomid = atom.serial;

                        // only update when atom.name === 'O'
                        prevCoorCA = currentCA;
                        prevCoorO = atom.coord;
                        prevColor = currentColor;
                    } // end if (atom.name === 'O' || (this.bCalphaOnly && atom.name === 'CA') ) {
//                } // end else { // both CA and O
            } // end if ((atom.name === 'O' || atom.name === 'CA') && !atom.het) {
        } // end for

        //if(fill) this.createTube(tubeAtoms, 'CA', 0.3, bHighlight);
        this.createTube(tubeAtoms, 'CA', 0.3, bHighlight);
    },

    createStrandBrick: function (brick, color, thickness) {
        var num = this.strandDIV;
        var div = this.axisDIV;
        var doNotSmoothen = false;
        var helixSheetWidth = this.helixSheetWidth;

        var points = {}; for (var k = 0; k < num; ++k) points[k] = [];
        var colors = [];
        var prevCO = null, ss = null;
        for (var i = 0; i < 2; ++i) {
            var currentCA = brick.coords[i];

            colors.push(new THREE.Color(color));

            var O = new THREE.Vector3(brick.coords[2].x, brick.coords[2].y, brick.coords[2].z);
            O.normalize();

            O.multiplyScalar(helixSheetWidth);
            if (prevCO !== null && O.dot(prevCO) < 0) O.negate();
            prevCO = O;
            for (var j = 0, numM1Inv2 = 2 / (num - 1); j < num; ++j) {
                var delta = -1 + numM1Inv2 * j;
                var v = new THREE.Vector3(currentCA.x + prevCO.x * delta, currentCA.y + prevCO.y * delta, currentCA.z + prevCO.z * delta);
                if (!doNotSmoothen) v.smoothen = true;
                points[j].push(v);
            }
        }
        this.createStrip(points[0], points[num - 1], colors, div, thickness);
    },

    createTubeSub: function (_points, colors, radii, bHighlight) {
        if (_points.length < 2) return;
        var circleDiv = this.tubeDIV, axisDiv = this.axisDIV;
        var circleDivInv = 1 / circleDiv, axisDivInv = 1 / axisDiv;
        var geo = new THREE.Geometry();
        var points = this.subdivide(_points, axisDiv);
        var prevAxis1 = new THREE.Vector3(), prevAxis2;
        for (var i = 0, lim = points.length; i < lim; ++i) {
            var r, idx = (i - 1) * axisDivInv;
            if (i === 0) r = radii[0];
            else {
                if (idx % 1 === 0) r = radii[idx];
                else {
                    var floored = Math.floor(idx);
                    var tmp = idx - floored;
                    r = radii[floored] * tmp + radii[floored + 1] * (1 - tmp);
                }
            }
            var delta, axis1, axis2;
            if (i < lim - 1) {
                delta = points[i].clone().sub(points[i + 1]);
                axis1 = new THREE.Vector3(0, -delta.z, delta.y).normalize().multiplyScalar(r);
                axis2 = delta.clone().cross(axis1).normalize().multiplyScalar(r);
                //      var dir = 1, offset = 0;
                if (prevAxis1.dot(axis1) < 0) {
                    axis1.negate(); axis2.negate();  //dir = -1;//offset = 2 * Math.PI / axisDiv;
                }
                prevAxis1 = axis1; prevAxis2 = axis2;
            } else {
                axis1 = prevAxis1; axis2 = prevAxis2;
            }
            for (var j = 0; j < circleDiv; ++j) {
                var angle = 2 * Math.PI * circleDivInv * j; //* dir  + offset;
                geo.vertices.push(points[i].clone().add(axis1.clone().multiplyScalar(Math.cos(angle))).add(axis2.clone().multiplyScalar(Math.sin(angle))));
            }
        }
        var offset = 0;
        for (var i = 0, lim = points.length - 1; i < lim; ++i) {
            //var c = new THREE.Color(colors[Math.round((i - 1) * axisDivInv)]);
            // For the first residue, use the next residue color; for the lasr residue, use the previous residue color
            var iColor = i;
            if(i < axisDiv) {
                iColor = axisDiv;
            }
            var c = new THREE.Color(colors[parseInt(iColor * axisDivInv)]);

            var reg = 0;
            var r1 = geo.vertices[offset].clone().sub(geo.vertices[offset + circleDiv]).lengthSq();
            var r2 = geo.vertices[offset].clone().sub(geo.vertices[offset + circleDiv + 1]).lengthSq();
            if (r1 > r2) { r1 = r2; reg = 1; };
            for (var j = 0; j < circleDiv; ++j) {
                geo.faces.push(new THREE.Face3(offset + j, offset + (j + reg) % circleDiv + circleDiv, offset + (j + 1) % circleDiv, undefined, c));
                geo.faces.push(new THREE.Face3(offset + (j + 1) % circleDiv, offset + (j + reg) % circleDiv + circleDiv, offset + (j + reg + 1) % circleDiv + circleDiv, undefined, c));
            }
            offset += circleDiv;
        }
        geo.computeFaceNormals();
        geo.computeVertexNormals(false);

        var mesh;
        if(bHighlight === 2) {
          mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.5, metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, vertexColors: THREE.FaceColors, side: THREE.DoubleSide }));
        }
        else if(bHighlight === 1) {
          mesh = new THREE.Mesh(geo, this.matShader);
          //mesh.material.depthTest = true;
          //mesh.material.depthWrite = false;
          //mesh.quaternion = this.quaternion;
        }
        else {
          mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ metal: false, overdraw: this.overdraw, specular: this.fractionOfColor, shininess: 30, emissive: 0x000000, vertexColors: THREE.FaceColors, side: THREE.DoubleSide }));
        }

        this.mdl.add(mesh);
        if(bHighlight === 1 || bHighlight === 2) {
            this.prevHighlightObjects.push(mesh);
        }
        else {
            this.objects.push(mesh);
        }
    },

    createTube: function (atoms, atomName, radius, bHighlight) {
        var points = [], colors = [], radii = [];
        var currentChain, currentResi;
        for (var i in atoms) {
            var atom = atoms[i];
            if ((atom.name === atomName) && !atom.het) {
                if (currentChain !== atom.chain || currentResi + 1 !== atom.resi) {
                    if(bHighlight !== 2) this.createTubeSub(points, colors, radii, bHighlight);
                    points = []; colors = []; radii = [];
                }
                points.push(atom.coord);

                radii.push(radius || (atom.b > 0 ? atom.b * 0.01 : 0.3));
                colors.push(atom.color);

                currentChain = atom.chain;
                currentResi = atom.resi;

                var scale = 1.2;
                if(bHighlight === 2 && !atom.ssbegin) {
                    this.createBox(atom, undefined, undefined, scale, undefined, bHighlight);
                }
            }
        }
        if(bHighlight !== 2) this.createTubeSub(points, colors, radii, bHighlight);
    },

    createCylinderHelix: function (atoms, radius, bHighlight) {
        var start = null;
        var currentChain, currentResi;
        var others = {}, beta = {};
        var i;
        for (i in atoms) {
            var atom = atoms[i];
            if (atom.het) continue;
            if ((atom.ss !== 'helix' && atom.ss !== 'sheet') || atom.ssend || atom.ssbegin) others[atom.serial] = atom;
            if (atom.ss === 'sheet') beta[atom.serial] = atom;
            if (atom.name !== 'CA') continue;
            if (atom.ss === 'helix' && atom.ssend) {
                if (start !== null && currentChain === atom.chain && currentResi < atom.resi) {
                    if(bHighlight === 1 || bHighlight === 2) {
                        this.createCylinder(start.coord, atom.coord, radius, this.highlightColor, bHighlight);
                    }
                    else {
                        this.createCylinder(start.coord, atom.coord, radius, atom.color);
                    }
                }

                start = null;
            }

            if (start === null && atom.ss === 'helix' && atom.ssbegin) {
                start = atom;

                currentChain = atom.chain;
                currentResi = atom.resi;
            }
        }

        if(bHighlight === 1 || bHighlight === 2) {
            if(Object.keys(others).length > 0) this.createTube(others, 'CA', 0.3, bHighlight);
            if(Object.keys(beta).length > 0) this.createStrand(beta, undefined, undefined, true, 0, this.helixSheetWidth, false, this.thickness * 2, bHighlight);
        }
        else {
            if(Object.keys(others).length > 0) this.createTube(others, 'CA', 0.3);
            if(Object.keys(beta).length > 0) this.createStrand(beta, undefined, undefined, true, 0, this.helixSheetWidth, false, this.thickness * 2);
        }
    },

    createSurfaceRepresentation: function (atoms, type, wireframe, opacity) {
        var geo;

        var ps = ProteinSurface({
            min: this.pmin,
            max: this.pmax,
            atoms: atoms,
            type: type
        });

        var verts = ps.verts;
        var faces = ps.faces;

        geo = new THREE.Geometry();
        geo.vertices = verts.map(function (v) {
            var r = new THREE.Vector3(v.x, v.y, v.z);
            r.atomid = v.atomid;
            return r;
        });
        geo.faces = faces.map(function (f) {
            return new THREE.Face3(f.a, f.b, f.c);
        });

        // remove the reference
        ps = null;

        geo.computeFaceNormals();
        geo.computeVertexNormals(false);

        geo.colorsNeedUpdate = true;
        geo.faces.forEach(function (f) {
            f.vertexColors = ['a', 'b', 'c' ].map(function (d) {
                return atoms[geo.vertices[f[d]].atomid].color;
            });
        });
        var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ overdraw: this.overdraw,
            vertexColors: THREE.VertexColors,
            wireframe: wireframe,
            opacity: opacity,
            transparent: true,
        }));
        this.mdl.add(mesh);
        // do not add surface to raycasting objects for picking
    },

    // nucleotides drawing is from GLMol
    drawNucleicAcidStick: function(atomlist, bHighlight) {
       var currentChain, currentResi, start = null, end = null;
       var i;

       for (i in atomlist) {
          var atom = atomlist[i];
          if (atom === undefined || atom.het) continue;

          if (atom.resi !== currentResi || atom.chain !== currentChain) {
             if (start !== null && end !== null) {
                this.createCylinder(new THREE.Vector3(start.coord.x, start.coord.y, start.coord.z),
                                  new THREE.Vector3(end.coord.x, end.coord.y, end.coord.z), 0.3, start.color, bHighlight);
             }
             start = null; end = null;
          }
          if (atom.name === 'O3\'') start = atom;
          if (atom.resn === '  A' || atom.resn === '  G' || atom.resn === ' DA' || atom.resn === ' DG') {
             if (atom.name === 'N1')  end = atom; //  N1(AG), N3(CTU)
          } else if (atom.name === 'N3') {
             end = atom;
          }
          currentResi = atom.resi; currentChain = atom.chain;
       }
       if (start !== null && end !== null)
          this.createCylinder(new THREE.Vector3(start.coord.x, start.coord.y, start.coord.z),
                            new THREE.Vector3(end.coord.x, end.coord.y, end.coord.z), 0.3, start.color, bHighlight);
    },

    drawCartoonNucleicAcid: function(atomlist, div, thickness, bHighlight) {
       this.drawStrandNucleicAcid(atomlist, 2, div, true, undefined, thickness, bHighlight);
    },

    drawStrandNucleicAcid: function(atomlist, num, div, fill, nucleicAcidWidth, thickness, bHighlight) {
       if(bHighlight === 2) {
           num = undefined;
           thickness = undefined;
       }

       nucleicAcidWidth = nucleicAcidWidth || this.nucleicAcidWidth;
       div = div || this.axisDIV;
       num = num || this.nucleicAcidStrandDIV;
       var i, j, k;
       var points = []; for (k = 0; k < num; k++) points[k] = [];
       var colors = [];
       var currentChain, currentResi, currentO3;
       var prevOO = null;

       for (i in atomlist) {
          var atom = atomlist[i];
          if (atom === undefined) continue;

          if ((atom.name === 'O3\'' || atom.name === 'OP2') && !atom.het) {
             if (atom.name === 'O3\'') { // to connect 3' end. FIXME: better way to do?
                if (currentChain !== atom.chain || currentResi + 1 !== atom.resi) {
                   if (currentO3 && prevOO) {
                      for (j = 0; j < num; j++) {
                         var delta = -1 + 2 / (num - 1) * j;
                         points[j].push(new THREE.Vector3(currentO3.x + prevOO.x * delta,
                          currentO3.y + prevOO.y * delta, currentO3.z + prevOO.z * delta));
                      }
                   }
                   if (fill) this.createStrip(points[0], points[1], colors, div, thickness, bHighlight);
                   for (j = 0; !thickness && j < num; j++)
                      this.createCurveSub(points[j], 1 ,colors, div, bHighlight);
                   var points = []; for (k = 0; k < num; k++) points[k] = [];
                   colors = [];
                   prevOO = null;
                }
                currentO3 = new THREE.Vector3(atom.coord.x, atom.coord.y, atom.coord.z);
                currentChain = atom.chain;
                currentResi = atom.resi;
                if(bHighlight === 1 || bHighlight === 2) {
                    colors.push(this.highlightColor);
                }
                else {
                    colors.push(atom.color);
                }

             } else { // OP2
                if (!currentO3) {prevOO = null; continue;} // for 5' phosphate (e.g. 3QX3)
                var O = new THREE.Vector3(atom.coord.x, atom.coord.y, atom.coord.z);
                O.sub(currentO3);
                O.normalize().multiplyScalar(nucleicAcidWidth);  // TODO: refactor
                //if (prevOO !== undefined && O.dot(prevOO) < 0) {
                if (prevOO !== null && O.dot(prevOO) < 0) {
                   O.negate();
                }
                prevOO = O;
                for (j = 0; j < num; j++) {
                   var delta = -1 + 2 / (num - 1) * j;
                   points[j].push(new THREE.Vector3(currentO3.x + prevOO.x * delta,
                     currentO3.y + prevOO.y * delta, currentO3.z + prevOO.z * delta));
                }
                currentO3 = null;
             }
          }
       }
       if (currentO3 && prevOO) {
          for (j = 0; j < num; j++) {
             var delta = -1 + 2 / (num - 1) * j;
             points[j].push(new THREE.Vector3(currentO3.x + prevOO.x * delta,
               currentO3.y + prevOO.y * delta, currentO3.z + prevOO.z * delta));
          }
       }
       if (fill) this.createStrip(points[0], points[1], colors, div, thickness, bHighlight);
       for (j = 0; !thickness && j < num; j++)
          this.createCurveSub(points[j], 1 ,colors, div, bHighlight);
    },

    drawSymmetryMates2: function() {
       if (this.biomtMatrices === undefined) return;

       var cnt = 1; // itself
       var centerSum = this.center.clone();

       for (var i = 0; i < this.biomtMatrices.length; i++) {  // skip itself
          var mat = this.biomtMatrices[i];
          if (mat === undefined) continue;

          var matArray = mat.toArray();

          // skip itself
          var bItself = 1;
          for(var j in matArray) {
            if(j == 0 || j == 5 || j == 10) {
              if(parseInt(1000*matArray[j]) != 1000) bItself = 0;
            }
            else if(j != 0 && j != 5 && j != 10 && j != 15) {
              if(parseInt(1000*matArray[j]) != 0) bItself = 0;
            }
          }

          if(bItself) continue;

          var symmetryMate = this.mdl.clone();
          symmetryMate.applyMatrix(mat);

          var center = this.center.clone();
          center.applyMatrix4(mat);
          centerSum.add(center);

          this.mdl.add(symmetryMate);

          ++cnt;
       }

       this.maxD *= Math.sqrt(cnt);
       //this.center = centerSum.multiplyScalar(1.0 / cnt);

       this.mdl.position.add(this.center).sub(centerSum.multiplyScalar(1.0 / cnt));

       // reset cameara
       this.setCamera();
    },

    // new: http://stackoverflow.com/questions/23514274/three-js-2d-text-sprite-labels
    // old: http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
    makeTextSprite: function ( message, parameters ) {
        if ( parameters === undefined ) parameters = {};
        var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
        var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 18;
        var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;

        var a = 1.0;
        var borderColor = parameters.hasOwnProperty("borderColor") ? this.hexToRgb(parameters["borderColor"], a) : { r:0, g:0, b:0, a:1.0 };
        var backgroundColor = parameters.hasOwnProperty("backgroundColor") ? this.hexToRgb(parameters["backgroundColor"], a) : { r:0, g:0, b:0, a:0.5 };

        a = 1.0;
        var textColor = parameters.hasOwnProperty("textColor") ? this.hexToRgb(parameters["textColor"], a) : { r:255, g:255, b:0, a:1.0 };

        var canvas = document.createElement('canvas');

        var context = canvas.getContext('2d');
        context.font = "Bold " + fontsize + "px " + fontface;

        var metrics = context.measureText( message );
        var textWidth = metrics.width;

        var radius = context.measureText( "M" ).width;

        // background color
        context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
        // border color
        context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";

        context.lineWidth = borderThickness;
        this.roundRect(context, borderThickness/2, borderThickness/2, (textWidth + borderThickness) * 1.1, fontsize*1.4 + borderThickness, radius * 0.3);
        // 1.4 is extra height factor for text below baseline: g,j,p,q.

        context.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";
        context.strokeStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";

        context.fillText( message, borderThickness + fontsize*0.1, fontsize + borderThickness);

        // canvas contents will be used for a texture
        var texture = new THREE.Texture(canvas)
        texture.needsUpdate = true;

        var frontOfTarget = true;
        //var spriteMaterial = new THREE.SpriteMaterial( { map: texture, useScreenCoordinates: false } );
        var spriteMaterial = new THREE.SpriteMaterial( {
            map: texture,
            useScreenCoordinates: false,
            depthTest: !frontOfTarget,
            depthWrite: !frontOfTarget
        } );

        var sprite = new THREE.Sprite( spriteMaterial );
        //sprite.scale.set(4, 2, 1.0);
        //sprite.scale.set(1, 1, 1);

        var factor = this.maxD / 100;

        sprite.scale.set(16*factor, 8*factor, 1.0);

        return sprite;
    },

    // http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    hexToRgb: function (hex, a) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: a
        } : null;
    },

    // function for drawing rounded rectangles
    roundRect: function (ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x+r, y);
        ctx.lineTo(x+w-r, y);
        ctx.quadraticCurveTo(x+w, y, x+w, y+r);
        ctx.lineTo(x+w, y+h-r);
        ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        ctx.lineTo(x+r, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-r);
        ctx.lineTo(x, y+r);
        ctx.quadraticCurveTo(x, y, x+r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },

    createLabelRepresentation: function (labels) {
        for (var i in labels) {
            var label = labels[i];
            // make sure fontsize is a number

            var labelsize = (label.size) ? label.size : this.LABELSIZE;
            var labelcolor = (label.color) ? label.color : '#ffff00';
            var labelbackground = (label.background) ? label.background : '#cccccc';

            var bb = this.makeTextSprite(label.text, {fontsize: parseInt(labelsize), textColor: labelcolor, borderColor: labelbackground, backgroundColor: labelbackground});

            //bb.position.copy(labelpositions[i]);
            bb.position.set(label.position.x, label.position.y, label.position.z);
            this.mdl.add(bb);
            // do not add labels to objects for picking
        }
    },

    getAtomsWithinAtom: function(atomlist, atomlistTarget, distance) {
       var i;

       var extent = this.getExtent(atomlistTarget);

       var targetRadiusSq1 = (extent[2][0] - extent[0][0]) * (extent[2][0] - extent[0][0]) + (extent[2][1] - extent[0][1]) * (extent[2][1] - extent[0][1]) + (extent[2][2] - extent[0][2]) * (extent[2][2] - extent[0][2]);
       var targetRadiusSq2 = (extent[2][0] - extent[1][0]) * (extent[2][0] - extent[1][0]) + (extent[2][1] - extent[1][1]) * (extent[2][1] - extent[1][1]) + (extent[2][2] - extent[1][2]) * (extent[2][2] - extent[1][2]);
       var targetRadiusSq = (targetRadiusSq1 > targetRadiusSq2) ? targetRadiusSq1 : targetRadiusSq2;
       var targetRadius = Math.sqrt(targetRadiusSq);

       var maxDistSq = (targetRadius + distance) * (targetRadius + distance);

       var ret = {};
       for (i in atomlist) {
          var atom = atomlist[i];

          if (atom.coord.x < extent[0][0] - distance || atom.coord.x > extent[1][0] + distance) continue;
          if (atom.coord.y < extent[0][1] - distance || atom.coord.y > extent[1][1] + distance) continue;
          if (atom.coord.z < extent[0][2] - distance || atom.coord.z > extent[1][2] + distance) continue;

          // exclude the target atoms
          if(atom.serial in atomlistTarget) continue;

          // only show protein or DNA/RNA
          //if(atom.serial in this.peptides || atom.serial in this.nucleotides) {
              var atomDistSq = (atom.coord.x - extent[2][0]) * (atom.coord.x - extent[2][0]) + (atom.coord.y - extent[2][1]) * (atom.coord.y - extent[2][1]) + (atom.coord.z - extent[2][2]) * (atom.coord.z - extent[2][2]);

              if(atomDistSq < maxDistSq) {
                  ret[atom.serial] = atom;
              }
          //}
       }

       return ret;
    },

    getExtent: function(atomlist) {
       var xmin = ymin = zmin = 9999;
       var xmax = ymax = zmax = -9999;
       var xsum = ysum = zsum = cnt = 0;
       var i;
       for (i in atomlist) {
          var atom = atomlist[i];
          cnt++;
          xsum += atom.coord.x; ysum += atom.coord.y; zsum += atom.coord.z;


          xmin = (xmin < atom.coord.x) ? xmin : atom.coord.x;

          ymin = (ymin < atom.coord.y) ? ymin : atom.coord.y;
          zmin = (zmin < atom.coord.z) ? zmin : atom.coord.z;
          xmax = (xmax > atom.coord.x) ? xmax : atom.coord.x;
          ymax = (ymax > atom.coord.y) ? ymax : atom.coord.y;
          zmax = (zmax > atom.coord.z) ? zmax : atom.coord.z;
       }

       return [[xmin, ymin, zmin], [xmax, ymax, zmax], [xsum / cnt, ysum / cnt, zsum / cnt]];
    },

    getAtomsFromPosition: function(point, threshold) {
       var i, atom;

       if(threshold === undefined || threshold === null) {
         threshold = 1;
       }

       for (i in this.atoms) {
          var atom = this.atoms[i];

          if(atom.coord.x < point.x - threshold || atom.coord.x > point.x + threshold) continue;
          if(atom.coord.y < point.y - threshold || atom.coord.y > point.y + threshold) continue;
          if(atom.coord.z < point.z - threshold || atom.coord.z > point.z + threshold) continue;

          return atom;
       }

       return null;
    },

    // http://soledadpenades.com/articles/three-js-tutorials/drawing-the-coordinate-axes/
    buildAxes: function (radius) {
        var axes = new THREE.Object3D();

        axes.add( this.createSingleLine( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0 + radius, 0, 0 ), 0xFF0000, false, 0.5 ) ); // +X
        axes.add( this.createSingleLine( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0 - radius, 0, 0 ), 0x800000, true, 0.5) ); // -X

        axes.add( this.createSingleLine( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0 + radius, 0 ), 0x00FF00, false, 0.5 ) ); // +Y
        axes.add( this.createSingleLine( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0 - radius, 0 ), 0x008000, true, 0.5 ) ); // -Y

        axes.add( this.createSingleLine( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, 0 + radius ), 0x0000FF, false, 0.5 ) ); // +Z
        axes.add( this.createSingleLine( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, 0 - radius ), 0x000080, true, 0.5 ) ); // -Z

        //return axes;
        this.scene.add( axes );

    },

    createSingleLine: function ( src, dst, colorHex, dashed, dashSize ) {
        var geom = new THREE.Geometry();
        var mat;

        if(dashed) {
            mat = new THREE.LineDashedMaterial({ linewidth: 1, color: colorHex, dashSize: dashSize, gapSize: dashSize });
        } else {
            mat = new THREE.LineBasicMaterial({ linewidth: 1, color: colorHex });
        }

        geom.vertices.push( src );
        geom.vertices.push( dst );
        if(dashed) geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

        var axis = new THREE.Line( geom, mat, THREE.LinePieces );

        return axis;
    },

    intersectHash: function(atoms1, atoms2) {
        var results = {};

        if(Object.keys(atoms1).length < Object.keys(atoms2).length) {
            for (var i in atoms1) {
                if (atoms2 !== undefined && atoms2[i]) {
                    results[i] = atoms1[i];
                }
            }
        }
        else {
            for (var i in atoms2) {
                if (atoms1 !== undefined && atoms1[i]) {
                    results[i] = atoms2[i];
                }
            }
        }

        return results;
    },

    // get atoms in allAtoms, but not in "atoms"
    excludeHash: function(includeAtoms, excludeAtoms) {
        var results = {};

        for (var i in includeAtoms) {
            if (!(i in excludeAtoms)) {
                results[i] = includeAtoms[i];
            }
        }

        return results;
    },

    unionHash: function(atoms1, atoms2) {
        return jQuery.extend({}, atoms1, atoms2);
    },

    intersectHash2Atoms: function(atoms1, atoms2) {
        return this.hash2Atoms(this.intersectHash(atoms1, atoms2));
    },

    // get atoms in allAtoms, but not in "atoms"
    excludeHash2Atoms: function(includeAtoms, excludeAtoms) {
        return this.hash2Atoms(this.excludeHash(includeAtoms, excludeAtoms));
    },

    unionHash2Atoms: function(atoms1, atoms2) {
        return this.hash2Atoms(this.unionHash(atoms1, atoms2));
    },

    hash2Atoms: function(hash) {
        var atoms = {};
        for(var i in hash) {
          atoms[i] = this.atoms[i];
        }

        return atoms;
    },

    centerAtoms: function(atoms) {
        var pmin = new THREE.Vector3( 9999, 9999, 9999);
        var pmax = new THREE.Vector3(-9999,-9999,-9999);
        var psum = new THREE.Vector3();
        var cnt = 0;

        for (var i in atoms) {
            var atom = this.atoms[i];
            var coord = atom.coord;
            psum.add(coord);
            pmin.min(coord);
            pmax.max(coord);
            ++cnt;
        }

        var maxD = pmax.distanceTo(pmin);

        return {"center": psum.multiplyScalar(1.0 / cnt), "maxD": maxD};
    },

    exportCanvas: function () {
        this.render();
        window.open(this.renderer.domElement.toDataURL('image/png'));
    },

    applyPrevColor: function () {
        for (var i in this.atoms) {
            var atom = this.atoms[i];
            atom.color = this.atomPrevColors[i];
        }
    },

    setColorByOptions: function (options, atoms, bUseInputColor) {
      if(bUseInputColor !== undefined && bUseInputColor) {
        for (var i in atoms) {
            var atom = this.atoms[i];

            this.atomPrevColors[i] = atom.color;
        }
      }
      else if(options.color.indexOf("#") === 0) {
        for (var i in atoms) {
            var atom = this.atoms[i];
            atom.color = new THREE.Color().setStyle(options.color.toLowerCase());

            this.atomPrevColors[i] = atom.color;
        }
      }
      else {
        switch (options.color.toLowerCase()) {
            case 'spectrum':
                var idx = 0;
                //var lastTerSerialInv = 1 / this.lastTerSerial;
                var lastTerSerialInv = 1 / this.cnt;
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = atom.het ? this.atomColors[atom.elem] || this.defaultAtomColor : new THREE.Color().setHSL(2 / 3 * (1 - idx++ * lastTerSerialInv), 1, 0.45);
                    //atom.color = this.atomColors[atom.elem] || this.defaultAtomColor;

                    this.atomPrevColors[i] = atom.color;
                }
                break;
            case 'chain':
                var index = -1, prevChain = '', colorLength = this.stdChainColors.length;
                for (var i in atoms) {
                    var atom = this.atoms[i];

                    if(atom.chain != prevChain) {
                        ++index;

                        index = index % colorLength;
                    }

                    atom.color = this.stdChainColors[index];

                    if(Object.keys(this.chainsColor).length > 0) this.updateChainsColor(atom);
                    this.atomPrevColors[i] = atom.color;

                    prevChain = atom.chain;
                }
                break;
            case 'secondary structure':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = atom.het ? this.atomColors[atom.elem] || this.defaultAtomColor : this.ssColors[atom.ss];

                    this.atomPrevColors[i] = atom.color;
                }

                break;
            case 'B factor':
                var firstAtom = this.getFirstAtomObj(this.atoms);
                if (!this.middB && firstAtom.b !== undefined) {
                    var minB = 1000, maxB = -1000;
                    for (var i in atoms) {
                        var atom = this.atoms[i];
                        if (minB > parseFloat(atom.b)) minB = parseFloat(atom.b);
                        if (maxB < parseFloat(atom.b)) maxB = parseFloat(atom.b);
                    }
                    this.middB = (maxB + minB) * 0.5;
                    this.spanB = (maxB - minB) * 0.5;
                    this.spanBinv = 1 / this.spanB;
                }
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    if(atom.b !== undefined && this.middB !== undefined) {
                        atom.color = atom.b < this.middB ? new THREE.Color().setRGB(1 - (s = (this.middB - atom.b) * this.spanBinv), 1 - s, 1) : new THREE.Color().setRGB(1, 1 - (s = (atom.b - this.middB) * this.spanBinv), 1 - s);
                    }

                    this.atomPrevColors[i] = atom.color;
                }
                break;
            case 'residue':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = atom.het ? this.atomColors[atom.elem] || this.defaultAtomColor : this.residueColors[atom.resn] || this.defaultResidueColor;

                    this.atomPrevColors[i] = atom.color;
                }
                break;
            case 'polarity':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = atom.het ? this.atomColors[atom.elem] || this.defaultAtomColor : this.polarityColors[atom.resn] || this.defaultResidueColor;

                    this.atomPrevColors[i] = atom.color;
                }
                break;
            case 'atom':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = this.atomColors[atom.elem] || this.defaultAtomColor;

                    this.atomPrevColors[i] = atom.color;
                }
                break;

            case 'white':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = new THREE.Color().setHex(0xFFFFFF);

                    if(Object.keys(this.chainsColor).length > 0) this.updateChainsColor(atom);
                    this.atomPrevColors[i] = atom.color;
                }
                break;

            case 'grey':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = new THREE.Color().setHex(0x888888);

                    if(Object.keys(this.chainsColor).length > 0) this.updateChainsColor(atom);
                    this.atomPrevColors[i] = atom.color;
                }
                break;


            case 'red':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = new THREE.Color().setHex(0xFF0000);

                    if(Object.keys(this.chainsColor).length > 0) this.updateChainsColor(atom);
                    this.atomPrevColors[i] = atom.color;
                }
                break;
            case 'green':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = new THREE.Color().setHex(0x00FF00);

                    if(Object.keys(this.chainsColor).length > 0) this.updateChainsColor(atom);
                    this.atomPrevColors[i] = atom.color;
                }
                break;
            case 'blue':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = new THREE.Color().setHex(0x0000FF);

                    if(Object.keys(this.chainsColor).length > 0) this.updateChainsColor(atom);
                    this.atomPrevColors[i] = atom.color;
                }
                break;
            case 'magenta':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = new THREE.Color().setHex(0xFF00FF);

                    if(Object.keys(this.chainsColor).length > 0) this.updateChainsColor(atom);
                    this.atomPrevColors[i] = atom.color;
                }
                break;
            case 'yellow':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = new THREE.Color().setHex(0xFFFF00);

                    if(Object.keys(this.chainsColor).length > 0) this.updateChainsColor(atom);
                    this.atomPrevColors[i] = atom.color;
                }
                break;
            case 'cyan':
                for (var i in atoms) {
                    var atom = this.atoms[i];
                    atom.color = new THREE.Color().setHex(0x00FFFF);

                    if(Object.keys(this.chainsColor).length > 0) this.updateChainsColor(atom);
                    this.atomPrevColors[i] = atom.color;
                }
                break;
            case 'custom':
                // do the coloring separately
                break;
        }
      }
    },

    updateChainsColor: function (atom) {
        var chainid = atom.structure + '_' + atom.chain;
        if(this.chainsColor[chainid] !== undefined) {  // for mmdbid and align input
            this.chainsColor[chainid] = atom.color;
        }
    },

    applyOptions: function (options) {
        if(options === undefined) options = this.options;

        this.applyDisplayOptions(options, this.displayAtoms);

        //common part options
        if (options.labels.toLowerCase() === 'yes') {
            this.createLabelRepresentation(this.labels);
        }

        if (options.lines.toLowerCase() === 'yes') {
            this.createLines(this.lines);
        }

        if (options.hbonds.toLowerCase() === 'yes') {
            var color = '#FFFFFF';
            if(options.background.toLowerCase() !== "black") {
              color = '#000000';
            }

             for (var i = 0, lim = Math.floor(this.hbondpoints.length / 2); i < lim; i++) {
                var p1 = this.hbondpoints[2 * i], p2 = this.hbondpoints[2 * i + 1];

                var line = {};
                line.position1 = this.hbondpoints[2 * i];
                line.position2 = this.hbondpoints[2 * i + 1];
                line.color = color;
                line.dashed = true;

                this.lines.push(line);
             }

            this.createLines(this.lines);
        }

        switch (options.rotationcenter.toLowerCase()) {
            case 'molecule center':
                // move the molecule to the origin
                if(this.center !== undefined) this.mdl.position.sub(this.center);
                break;
            case 'pick center':
                if(this.pickedatom !== undefined) {
                  this.mdl.position.sub(this.pickedatom.coord);
                }
                break;
            case 'display center':
                var center = this.centerAtoms(this.displayAtoms).center;
                this.mdl.position.sub(center);
                break;
            case 'highlight center':
                var center = this.centerAtoms(this.highlightAtoms).center;
                this.mdl.position.sub(center);
                break;
        }
        switch (options.axis.toLowerCase()) {
            case 'yes':
                this.axis = true;

                this.buildAxes(this.maxD/2);

                break;
            case 'no':
                this.axis = false;
                break;
        }
        switch (options.picking.toLowerCase()) {
            case 'atom':
                this.picking = 1;
                //this.showpicking = 'yes';
                break;
            case 'no':
                this.picking = 0;
                break;
            case 'residue':
                this.picking = 2;
                break;
        }
    },

    drawHelixBrick: function(molid2ss, molid2color) {
        for(var molid in molid2ss) {
          for(var j = 0, jl = molid2ss[molid].length; j < jl; ++j) {
            if(molid2ss[molid][j].type === 'helix') {
              var radius = 1.6;
              var color = new THREE.Color(molid2color[molid]);

              var p0 = new THREE.Vector3(molid2ss[molid][j].coords[0].x, molid2ss[molid][j].coords[0].y, molid2ss[molid][j].coords[0].z);
              var p1 = new THREE.Vector3(molid2ss[molid][j].coords[1].x, molid2ss[molid][j].coords[1].y, molid2ss[molid][j].coords[1].z);

              this.createCylinder(p0, p1, radius, color);
            }

            else if(molid2ss[molid][j].type === 'brick') {
              // the original bricks are very thin
              //var brickArray = molid2ss[molid][j].bricks;

              //var color = new THREE.Color(molid2color[molid]);
              //this.createBrick(brickArray, color);

              // create strands with any width and thickness
              var brick = molid2ss[molid][j];
              var color = molid2color[molid];
              this.createStrandBrick(brick, color, this.thickness);
            }
            else if(molid2ss[molid][j].type === 'coil') {
                 var points = [], colors = [], radii = [];

                 var p0 = new THREE.Vector3(molid2ss[molid][j].coords[0].x, molid2ss[molid][j].coords[0].y, molid2ss[molid][j].coords[0].z);
                 var p1 = new THREE.Vector3(molid2ss[molid][j].coords[1].x, molid2ss[molid][j].coords[1].y, molid2ss[molid][j].coords[1].z);

                 var color = new THREE.Color(molid2color[molid]);

                 var line = this.createSingleLine( p0, p1, color, false);
                 this.mdl.add(line);
                 this.objects.push(line);
            }
          } // inner for
        } // outer for
    },

    applyDisplayOptions: function (options, atoms, bHighlight) { // atoms: hash of key -> 1
        if(options === undefined) options = this.options;

        var residueHash = {};
        var singletonResidueHash = {};
        var atomsObj = {};
        var residueid;
        //if(bHighlight === 1 || bHighlight === 2) {
        if(bHighlight === 1) {
            atomsObj = this.hash2Atoms(atoms);

            for(var i in atomsObj) {
                var atom = atomsObj[i];

                residueid = atom.structure + '_' + atom.chain + '_' + atom.resi;
                residueHash[residueid] = 1;
            }

            // find singleton residues
            for(var i in residueHash) {
                var last = i.lastIndexOf('_');
                var base = i.substr(0, last + 1);
                var lastResi = parseInt(i.substr(last + 1));

                var prevResidueid = base + (lastResi - 1).toString();
                var nextResidueid = base + (lastResi + 1).toString();

                if(!residueHash.hasOwnProperty(prevResidueid) && !residueHash.hasOwnProperty(prevResidueid)) {
                    singletonResidueHash[i] = 1;
                }
            }

            // show the only atom in a transparent box
            if(Object.keys(atomsObj).length === 1 && Object.keys(this.residues[residueid]).length > 1
                  && atomsObj[Object.keys(atomsObj)[0]].style !== 'sphere' && atomsObj[Object.keys(atomsObj)[0]].style !== 'dot') {
                if(this.bCid === undefined || !this.bCid) {
                    for(var i in atomsObj) {
                        var atom = atomsObj[i];
                        var scale = 1.0;
                        this.createBox(atom, undefined, undefined, scale, undefined, bHighlight);
                    }
                }
            }
            else {
                // if only one residue, add the next residue in order to show highlight
                for(var residueid in singletonResidueHash) {
                    var atom = this.getFirstAtomObj(this.residues[residueid]);
                    var prevResidueid = atom.structure + '_' + atom.chain + '_' + parseInt(atom.resi - 1);
                    var nextResidueid = atom.structure + '_' + atom.chain + '_' + parseInt(atom.resi + 1);

                    //ribbon, strand, cylinder & plate, nucleotide cartoon, phosphorus trace, C alpha trace, B factor tube, lines, stick, ball & stick, sphere, dot

                    if(atom.style === 'cylinder & plate' && atom.ss === 'helix') { // no way to highlight part of cylinder
                        for(var i in this.residues[residueid]) {
                            var atom = this.atoms[i];
                            var scale = 1.0;
                            this.createBox(atom, undefined, undefined, scale, undefined, bHighlight);
                        }
                    }
                    else if( (atom.style === 'ribbon' && atom.ss === 'coil') || (atom.style === 'strand' && atom.ss === 'coil') || atom.style === 'phosphorus trace' || atom.style === 'C alpha trace' || atom.style === 'B factor tube' || (atom.style === 'cylinder & plate' && atom.ss !== 'helix') ) {
                        var bAddResidue = false;
                        // add the next residue with same style
                        if(!bAddResidue && this.residues.hasOwnProperty(nextResidueid)) {
                            var index2 = Object.keys(this.residues[nextResidueid])[0];
                            var atom2 = this.hash2Atoms(this.residues[nextResidueid])[index2];
                            if( (atom.style === atom2.style && !atom2.ssbegin) || atom2.ssbegin) {
                                var residueAtoms = this.residues[nextResidueid];
                                atoms = this.unionHash(atoms, residueAtoms);

                                bAddResidue = true;

                                // record the highlight style for the artificial residue
                                if(atom2.ssbegin) {
                                    for(var i in residueAtoms) {
                                        this.atoms[i].notshow = true;
                                    }
                                }
                            }
                        }

                        // add the previous residue with same style
                        if(!bAddResidue && this.residues.hasOwnProperty(prevResidueid)) {
                            var index2 = Object.keys(this.residues[prevResidueid])[0];
                            var atom2 = this.hash2Atoms(this.residues[prevResidueid])[index2];
                            if(atom.style === atom2.style) {
                                atoms = this.unionHash(atoms, this.residues[prevResidueid]);

                                bAddResidue = true;
                            }
                        }
                    }
                    else if( (atom.style === 'ribbon' && atom.ss !== 'coil' && atom.ssend) || (atom.style === 'strand' && atom.ss !== 'coil' && atom.ssend)) {
                        var bAddResidue = false;
                        // add the next residue with same style
                        if(!bAddResidue && this.residues.hasOwnProperty(nextResidueid)) {
                            var index2 = Object.keys(this.residues[nextResidueid])[0];
                            var atom2 = this.hash2Atoms(this.residues[nextResidueid])[index2];
                            //if(atom.style === atom2.style && !atom2.ssbegin) {
                                atoms = this.unionHash(atoms, this.residues[nextResidueid]);

                                bAddResidue = true;
                            //}
                        }
                    }
                } // end for
            } // end else {
        } // end if(bHighlight === 1)

        this.setStyle2Atoms(atoms);

        for(var style in this.style2atoms) {
          // 13 styles: ribbon, strand, cylinder & plate, nucleotide cartoon, phosphorus trace, C alpha trace, B factor tube, lines, stick, ball & stick, sphere, dot, nothing
          atomHash = this.style2atoms[style];

          if(style === 'ribbon') {
              this.createStrand(this.hash2Atoms(atomHash), 2, undefined, true, undefined, undefined, false, this.thickness, bHighlight);
          }
          else if(style === 'strand') {
              this.createStrand(this.hash2Atoms(atomHash), null, null, null, null, null, false, undefined, bHighlight);
          }
          else if(style === 'cylinder & plate') {
            this.createCylinderHelix(this.hash2Atoms(atomHash), 1.6, bHighlight);
          }
          else if(style === 'nucleotide cartoon') {
            this.drawCartoonNucleicAcid(this.hash2Atoms(atomHash), null, this.thickness, bHighlight);

            if(bHighlight !== 2) this.drawNucleicAcidStick(this.hash2Atoms(atomHash), bHighlight);
          }
          else if(style === 'phosphorus trace') {
            this.createCylinderCurve(this.hash2Atoms(atomHash), 'P', 0.2, false, bHighlight);
          }
          else if(style === 'phosphorus lines') {
            this.createCylinderCurve(this.hash2Atoms(atomHash), 'P', 0.2, true, bHighlight);
          }
          else if(style === 'C alpha trace') {
            this.createCylinderCurve(this.hash2Atoms(atomHash), 'CA', 0.2, false, bHighlight);
          }
          else if(style === 'B factor tube') {
            this.createTube(this.hash2Atoms(atomHash), 'CA', null, bHighlight);
          }
          else if(style === 'lines') {
            if(bHighlight === 1) {
                this.createStickRepresentation(this.hash2Atoms(atomHash), 0.1, 0.1, undefined, bHighlight);
            }
            else {
                this.createLineRepresentation(this.hash2Atoms(atomHash), bHighlight);
            }
          }
          else if(style === 'stick') {
            this.createStickRepresentation(this.hash2Atoms(atomHash), this.cylinderRadius, this.cylinderRadius, undefined, bHighlight);
          }
          else if(style === 'ball & stick') {
            this.createStickRepresentation(this.hash2Atoms(atomHash), this.cylinderRadius, this.cylinderRadius * 0.5, 0.3, bHighlight);
          }
          else if(style === 'sphere') {
            this.createSphereRepresentation(this.hash2Atoms(atomHash), this.sphereRadius, undefined, undefined, bHighlight);
          }
          else if(style === 'dot') {
            this.createSphereRepresentation(this.hash2Atoms(atomHash), this.sphereRadius, false, 0.3, bHighlight);
          }

          // do not show highlight if structure is not shown
          /*
          else { // structure not shown, show the highlight
            if(bHighlight === 2) bHighlight === 1;

            if(bHighlight === 1) {
                var atoms = this.hash2Atoms(atomHash);
                var nonHetAtoms = {};
                for(var i in atoms) {
                    var atom = atoms[i];
                    if(atom.het) {
                        var scale = 1.0;
                        this.createBox(atom, undefined, undefined, scale, undefined, bHighlight);
                    }
                    else {
                        nonHetAtoms[i] = atom;
                    }
                }

                if(Object.keys(nonHetAtoms).length > 0) {
                    this.createStrand(nonHetAtoms, null, null, null, null, null, false, undefined, bHighlight);
                }
            }
          }
          */
        } // end for loop

        //switch (options.wireframe.toLowerCase()) {
        switch (options.wireframe) {
            case 'yes':
                options.wireframe = true;
                break;
            case 'no':
                options.wireframe = false;
                break;
        }

        options.opacity = parseFloat(options.opacity);

        if(options.showsurface.toLowerCase() === 'yes') {
          var currAtoms = {};

          currAtoms = this.hash2Atoms(this.highlightAtoms);

          switch (options.surface.toLowerCase()) {
              case 'van der waals surface':
                  this.createSurfaceRepresentation(currAtoms, 1, options.wireframe, options.opacity);
                  break;
              case 'solvent excluded surface':
                  this.createSurfaceRepresentation(currAtoms, 2, options.wireframe, options.opacity);
                  break;
              case 'solvent accessible surface':
                  this.createSurfaceRepresentation(currAtoms, 3, options.wireframe, options.opacity);
                  break;
              case 'molecular surface':
                  this.createSurfaceRepresentation(currAtoms, 4, options.wireframe, options.opacity);
                  break;
          }
        }

        //this.renderer.autoClear = options.effect !== 'oculus rift' && options.effect !== 'stereo';
        //this.effect = this.effects[options.effect];
        //this.effect.setSize(this.container.width(), this.container.height());
    },

    setStyle2Atoms: function (atoms) {
          this.style2atoms = {};

          for(var i in atoms) {
            if(this.style2atoms[this.atoms[i].style] === undefined) this.style2atoms[this.atoms[i].style] = {};

            this.style2atoms[this.atoms[i].style][i] = 1;
          }
    },

    // set atom style when loading a structure
    setAtomStyleByOptions: function (options) {
        if (options.sidechains !== undefined) {
            for(var i in this.peptides) {
              this.atoms[i].style = options.sidechains.toLowerCase();
            }
        }

        if (options.secondary !== undefined) {
            for(var i in this.peptides) {
              this.atoms[i].style = options.secondary.toLowerCase();
            }
        }

        if (options.ligands !== undefined) {
            for(var i in this.ligands) {
              this.atoms[i].style = options.ligands.toLowerCase();
            }
        }

        if (options.ions !== undefined) {
            for(var i in this.ions) {
              this.atoms[i].style = options.ions.toLowerCase();
            }
        }

        if (options.water !== undefined) {
            for(var i in this.water) {
              this.atoms[i].style = options.water.toLowerCase();
            }
        }

        if (options.nucleotides !== undefined) {
            for(var i in this.nucleotides) {
              this.atoms[i].style = options.nucleotides.toLowerCase();
            }
        }
    },

    rebuildScene: function (options) {
        jQuery.extend(this.options, options);

        this.scene = new THREE.Scene();

        this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);

        //this.directionalLight.shadowMapWidth = 2048; // default is 512
        //this.directionalLight.shadowMapHeight = 2048; // default is 512

        if(this.camera_z > 0) {
          this.directionalLight.position.set(0, 0, 1);
        }
        else {
          this.directionalLight.position.set(0, 0, -1);
        }

        var ambientLight = new THREE.AmbientLight(0x202020);

        this.scene.add(this.directionalLight);
        this.scene.add(ambientLight);

        this.mdl = new THREE.Object3D();
        this.scene.add(this.mdl);

        // related to picking
        this.objects = []; // define objects for picking, not all elements are used for picking
        this.raycaster = new THREE.Raycaster();
        this.projector = new THREE.Projector();
        this.mouse = new THREE.Vector2();

        //this.mdl = new THREE.Object3D();
        //this.scene.add(this.mdl);

        var background = this.backgroundColors[this.options.background.toLowerCase()];
        this.renderer.setClearColor(background);
//        this.scene.fog = new THREE.Fog(background, 100, 200);

        this.perspectiveCamera = new THREE.PerspectiveCamera(20, this.container.whratio, 0.1, 10000);
        this.perspectiveCamera.position.set(0, 0, this.camera_z);
        this.perspectiveCamera.lookAt(new THREE.Vector3(0, 0, 0));

        this.orthographicCamera = new THREE.OrthographicCamera();
        this.orthographicCamera.position.set(0, 0, this.camera_z);
        this.orthographicCamera.lookAt(new THREE.Vector3(0, 0, 0));

        this.cameras = {
            perspective: this.perspectiveCamera,
            orthographic: this.orthographicCamera,
        };

        this.setCamera();

//        if (this.camera === this.perspectiveCamera){
//            this.scene.fog.near = this.camera.near + 0.4 * (this.camera.far - this.camera.near);
//            if (this.scene.fog.near > center) this.scene.fog.near = center;
//            this.scene.fog.far = this.camera.far;
//        }

        this.applyOptions( this.options );
    },

    setCamera: function() {
        this.camera = this.cameras[this.options.camera.toLowerCase()];

        if(this.camera === this.perspectiveCamera) {
            if(this.camera_z > 0) {
              this.camera.position.z = this.maxD * 2; // forperspective, the z positionshould be large enough to see the whole molecule
            }
            else {
              this.camera.position.z = -this.maxD * 2; // forperspective, the z positionshould be large enough to see the whole molecule
            }

            this.controls = new THREE.TrackballControls( this.camera, document.getElementById(this.id), this );
        }
        else if (this.camera === this.orthographicCamera){
            //this.camera.right = this.maxD/2 * 1.2;
            this.camera.right = this.maxD/2 * 2.5;
            this.camera.left = -this.camera.right;
            this.camera.top = this.camera.right /this.container.whratio;
            this.camera.bottom = -this.camera.right /this.container.whratio;

            if(this.camera_z > 0) {
              this.camera.near = 10000;
              this.camera.far = -10000;
            }
            else {
              this.camera.near = -10000;
              this.camera.far = 10000;
            }

            this.controls = new THREE.OrthographicTrackballControls( this.camera, document.getElementById(this.id), this );
        }

        this.camera.updateProjectionMatrix();
    },

    applyTransformation: function (_zoomFactor, mouseChange, quaternion) {
        var para = {};
        para.update = false;

        // zoom
        para._zoomFactor = _zoomFactor;

        // translate
        para.mouseChange = new THREE.Vector2();
        para.mouseChange.copy(mouseChange);

        // rotation
        para.quaternion = new THREE.Quaternion();
        para.quaternion.copy(quaternion);

        this.controls.update(para);
    },

    render: function () {
        //this.directionalLight.position.copy(this.camera.position).normalize();
        this.directionalLight.position.copy(this.camera.position);

        //this.effect.render(this.scene, this.camera);
        this.renderer.gammaInput = true
        this.renderer.gammaOutput = true

        this.renderer.setPixelRatio( window.devicePixelRatio ); // r71
        this.renderer.render(this.scene, this.camera);
    },

    setRotationCenter: function (coord) {
        this.mdl.position.sub(coord);
    },

    draw: function (options, bPrevColor) {
        this.rebuildScene(options);

        if(bPrevColor === undefined || bPrevColor) this.applyPrevColor();

        if(this.bSSOnly) this.drawHelixBrick(this.molid2ss, this.molid2color);

        if(this.bAssembly) this.drawSymmetryMates2();

        // show the highlightAtoms
        if(this.highlightAtoms !== undefined && Object.keys(this.highlightAtoms).length > 0 && Object.keys(this.highlightAtoms).length < Object.keys(this.displayAtoms).length) {
            this.removeHighlightObjects();
            this.addHighlightObjects(undefined, undefined);
        }

        if(this.bRender === true) {
          this.applyTransformation(this._zoomFactor, this.mouseChange, this.quaternion);
          this.render();
        }
    },


    // zoom
    zoomIn: function (normalizedFactor) { // 0.1
      var para = {};
      para._zoomFactor = 1 - normalizedFactor;
      para.update = true;
      this.controls.update(para);
      this.render();
    },

    zoomOut: function (normalizedFactor) { // 0.1
      var para = {};
      para._zoomFactor = 1 + normalizedFactor;
      para.update = true;
      this.controls.update(para);
      this.render();
    },

    // rotate
    rotateLeft: function (degree) { // 5
      var axis = new THREE.Vector3(0,1,0);
      var angle = -degree / 180.0 * Math.PI;

      axis.applyQuaternion( this.camera.quaternion ).normalize();

      var quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle( axis, -angle );

      var para = {};
      para.quaternion = quaternion;
      para.update = true;

      this.controls.update(para);
      this.render();
    },

    rotateRight: function (degree) { // 5
      var axis = new THREE.Vector3(0,1,0);
      var angle = degree / 180.0 * Math.PI;

      axis.applyQuaternion( this.camera.quaternion ).normalize();

      var quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle( axis, -angle );

      var para = {};
      para.quaternion = quaternion;
      para.update = true;

      this.controls.update(para);
      this.render();
    },

    rotateUp: function (degree) { // 5
      var axis = new THREE.Vector3(1,0,0);
      var angle = -degree / 180.0 * Math.PI;

      axis.applyQuaternion( this.camera.quaternion ).normalize();

      var quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle( axis, -angle );

      var para = {};
      para.quaternion = quaternion;
      para.update = true;

      this.controls.update(para);
      this.render();
    },

    rotateDown: function (degree) { // 5
      var axis = new THREE.Vector3(1,0,0);
      var angle = degree / 180.0 * Math.PI;

      axis.applyQuaternion( this.camera.quaternion ).normalize();

      var quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle( axis, -angle );

      var para = {};
      para.quaternion = quaternion;
      para.update = true;

      this.controls.update(para);
      this.render();
    },

    // translate
    translateLeft: function (percentScreenSize) { // 1
      var mouseChange = new THREE.Vector2(0,0);

      // 1 means the full screen size
      mouseChange.x -= percentScreenSize / 100.0;

      var para = {};
      para.mouseChange = mouseChange;
      para.update = true;

      this.controls.update(para);
      this.render();
    },

    translateRight: function (percentScreenSize) { // 1
      var mouseChange = new THREE.Vector2(0,0);

      mouseChange.x += percentScreenSize / 100.0;

      var para = {};
      para.mouseChange = mouseChange;
      para.update = true;

      this.controls.update(para);
      this.render();
    },

    translateUp: function (percentScreenSize) { // 1
      var mouseChange = new THREE.Vector2(0,0);

      mouseChange.y -= percentScreenSize / 100.0;

      var para = {};
      para.mouseChange = mouseChange;
      para.update = true;

      this.controls.update(para);
      this.render();
    },

    translateDown: function (percentScreenSize) { // 1
      var mouseChange = new THREE.Vector2(0,0);

      mouseChange.y += percentScreenSize / 100.0;

      var para = {};
      para.mouseChange = mouseChange;
      para.update = true;

      this.controls.update(para);
      this.render();
    },

    showPicking: function(atom) {
      this.removeHighlightObjects();

      this.highlightAtoms = {};
      if(this.picking === 1) {
          this.highlightAtoms[atom.serial] = 1;
       }
      else if(this.picking === 2) {
        var residueid = atom.structure + '_' + atom.chain + '_' + atom.resi;
        this.highlightAtoms = this.residues[residueid];
      }

      this.addHighlightObjects();

      //var text = '#' + atom.structure + '.' + atom.chain + ':' + atom.resi + '@' + atom.name;
      var residueText = '.' + atom.chain + ':' + atom.resi;
      var text = residueText + '@' + atom.name;

      var labels = [];
      var label = {};
      label.position = atom.coord;

      if(this.picking === 1) {
        label.text = text;
      }
      else if(this.picking === 2) {
        label.text = residueText;
      }

      labels.push(label);

      //http://www.johannes-raida.de/tutorials/three.js/tutorial13/tutorial13.htm
      this.createLabelRepresentation(labels);
    },

    removeHighlightObjects: function () {
       // remove prevous highlight
       for(var i in this.prevHighlightObjects) {
           this.mdl.remove(this.prevHighlightObjects[i]);
       }

       this.prevHighlightObjects = [];

//       this.applyTransformation(this._zoomFactor, this.mouseChange, this.quaternion);
       this.render();
    },

    addHighlightObjects: function (color) {
       if(color === undefined) color = this.highlightColor;

       this.applyDisplayOptions(this.options, this.intersectHash(this.highlightAtoms, this.displayAtoms), this.bHighlight);

//       this.applyTransformation(this._zoomFactor, this.mouseChange, this.quaternion);
       this.render();
    },

    zoominSelection: function() {
       // center on the highlightAtoms if more than one residue is selected
       if(Object.keys(this.highlightAtoms).length > 1) {
               var centerAtomsResults = this.centerAtoms(this.hash2Atoms(this.highlightAtoms));
               this.maxD = centerAtomsResults.maxD;
               if (this.maxD < 25) this.maxD = 25;

               this.mdl.position.add(this.center).sub(centerAtomsResults.center);

               this.center = centerAtomsResults.center;

               // reset cameara
               this.setCamera();
       }

//       this.applyTransformation(this._zoomFactor, this.mouseChange, this.quaternion);
       this.render();
    }
};
