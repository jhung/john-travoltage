// Copyright 2013-2015, University of Colorado Boulder

/**
 * Main ScreenView of simulation. Drawing starts here
 *
 * @author Sam Reid
 * @author Vasily Shakhov (Mlearner)
 * @author Justin Obara
 */
define( function( require ) {
  'use strict';

  // modules
  var Bounds2 = require( 'DOT/Bounds2' );
  var ScreenView = require( 'JOIST/ScreenView' );
  var Line = require( 'SCENERY/nodes/Line' );
  var inherit = require( 'PHET_CORE/inherit' );
  var BackgroundElementsNode = require( 'JOHN_TRAVOLTAGE/john-travoltage/view/BackgroundElementsNode' );
  var AccessibleFormNode = require( 'JOHN_TRAVOLTAGE/john-travoltage/view/AccessibleFormNode' );
  var AccessibleLabelNode = require( 'JOHN_TRAVOLTAGE/john-travoltage/view/AccessibleLabelNode' );
  var AccessibleDescriptionNode = require( 'JOHN_TRAVOLTAGE/john-travoltage/view/AccessibleDescriptionNode' );
  var AppendageRangeMaps = require( 'JOHN_TRAVOLTAGE/john-travoltage/AppendageRangeMaps' );
  var AppendageNode = require( 'JOHN_TRAVOLTAGE/john-travoltage/view/AppendageNode' );
  var SparkNode = require( 'JOHN_TRAVOLTAGE/john-travoltage/view/SparkNode' );
  var ElectronLayerNode = require( 'JOHN_TRAVOLTAGE/john-travoltage/view/ElectronLayerNode' );
  var Shape = require( 'KITE/Shape' );
  var Path = require( 'SCENERY/nodes/Path' );
  var Node = require( 'SCENERY/nodes/Node' );
  var SoundToggleButton = require( 'SCENERY_PHET/buttons/SoundToggleButton' );
  var ResetAllButton = require( 'SCENERY_PHET/buttons/ResetAllButton' );
  var DebugPositions = require( 'JOHN_TRAVOLTAGE/john-travoltage/view/DebugPositions' );
  var Circle = require( 'SCENERY/nodes/Circle' );
  var platform = require( 'PHET_CORE/platform' );
  var HBox = require( 'SCENERY/nodes/HBox' );
  var JohnTravoltageQueryParameters = require( 'JOHN_TRAVOLTAGE/john-travoltage/JohnTravoltageQueryParameters' );
  var JohnTravoltageAudio = require( 'JOHN_TRAVOLTAGE/john-travoltage/view/JohnTravoltageAudio' );
  var JohnTravoltageModel = require( 'JOHN_TRAVOLTAGE/john-travoltage/model/JohnTravoltageModel' );
  var johnTravoltage = require( 'JOHN_TRAVOLTAGE/johnTravoltage' );

  // images
  var arm = require( 'image!JOHN_TRAVOLTAGE/arm.png' );
  var leg = require( 'image!JOHN_TRAVOLTAGE/leg.png' );

  // constants
  var SONIFICATION_CONTROL = JohnTravoltageQueryParameters.SONIFICATION;
  var SHOW_DEBUG_INFO = JohnTravoltageQueryParameters.SHOW_DEBUG_INFO;

  // strings
  var johnTravoltageTitleString = require( 'string!JOHN_TRAVOLTAGE/john-travoltage.title' );
  var armSliderLabelString = require( 'string!JOHN_TRAVOLTAGE/armSliderLabel' );
  var legSliderLabelString = require( 'string!JOHN_TRAVOLTAGE/legSliderLabel' );
  var electronsDischargedString = require( 'string!JOHN_TRAVOLTAGE/electrons.discharged' );

  /**
   * @param {JohnTravoltageModel} model
   * @param {Tandem} tandem
   * @param {Object} options
   * @constructor
   */
  function JohnTravoltageView( model, tandem, options ) {


    // HACK ALERT!
    // Testing the nexus!
    // http://169.254.86.49:9081/
    var websocket = new WebSocket('ws://localhost:9081/bindModel/nexus.bonang.johnTravoltage/position.armPosition');
     websocket.onmessage = function (evt) {
         var inputs = JSON.parse(evt.data);

         var armPosition = inputs.armPosition; // in degrees
         var armPositionRadians = armPosition * Math.PI / 180;

         var legPosition = inputs.legPosition; // in degrees;
         var legPositionRadians = legPosition * Math.PI / 180;

        //  console.log( legPositionRadians );
         model.arm.angle = armPositionRadians;
         model.leg.angle = legPositionRadians;
        //  console.log( inputs.armPosition );
     };

    var johnTravoltageView = this;
    this.model = model;
    options = _.extend( {
      //TODO: Once https://github.com/phetsims/john-travoltage/issues/98 has been addressed, update how the peerIDs
      //are added/referenced by the view.
      peerIDs: {
        alert: 'john-travoltage-alert',
        status: 'john-travoltage-status'
      }
    }, options );

    //The sim works best in most browsers using svg.
    //But in firefox on Win8 it is very slow and buggy, so use canvas on firefox.
    ScreenView.call( this, {
      renderer: platform.firefox ? 'canvas' : null,
      layoutBounds: new Bounds2( 0, 0, 768, 504 ),
      screenLabel: johnTravoltageTitleString
    } );

    //add background elements
    this.addChild( new BackgroundElementsNode() );

    //Split layers after background for performance
    this.addChild( new Node( { layerSplit: true, pickable: false } ) );

    //add an form element to contain all controls
    var accessibleFormNode = new AccessibleFormNode();
    this.addChild( accessibleFormNode );

    //arm and leg - only interactive elements
    var legLabel = new AccessibleLabelNode( legSliderLabelString );
    accessibleFormNode.addChild(legLabel);
    this.leg = new AppendageNode( model.leg, leg, 25, 28, Math.PI / 2 * 0.7, model.soundProperty,
      AppendageRangeMaps.leg,
      { controls: [ options.peerIDs.status ] }
    );
    legLabel.addChild( this.leg );

    var armLabel = new AccessibleLabelNode( armSliderLabelString );
    accessibleFormNode.addChild(armLabel);
    // the keyboardMidPointOffset was manually calculated as a radian offset that will trigger a discharge with the
    // minimum charge level.
    this.arm = new AppendageNode( model.arm, arm, 4, 45, -0.1, model.soundProperty, AppendageRangeMaps.arm,
      { keyboardMidPointOffset: 0.41, controls: [ options.peerIDs.status ] } );
    armLabel.addChild( this.arm );

    //Show the dotted lines again when the sim is reset
    model.resetEmitter.addListener( function() {
      if ( !johnTravoltageView.leg.dragging ) {
        johnTravoltageView.leg.border.visible = true;
      }
      if ( !johnTravoltageView.arm.dragging ) {
        johnTravoltageView.arm.border.visible = true;
      }
    } );

    //spark
    accessibleFormNode.addChild( new SparkNode( model.sparkVisibleProperty, model.arm, model.doorknobPosition,
      function( listener ) {
        model.stepEmitter.addListener( listener );
      }, electronsDischargedString, { peerID: options.peerIDs.alert } ) );

    //Sound button and reset all button
    var soundButton = new SoundToggleButton( model.soundProperty, tandem.createTandem( 'soundButton' ) );
    var resetAllButton = new ResetAllButton( {
      listener: model.reset.bind( model ),
      scale: 1.32
    } );
    resetAllButton.scale( soundButton.height / resetAllButton.height );
    accessibleFormNode.addChild( new HBox( {
      spacing: 10,
      children: [ soundButton, resetAllButton ],
      right: this.layoutBounds.maxX - 7,
      bottom: this.layoutBounds.maxY - 7
    } ) );

    //add sonification if enabled
    if ( SONIFICATION_CONTROL ) {
      this.audioView = new JohnTravoltageAudio( model, this.arm, SONIFICATION_CONTROL );
    }

    //Use a layer for electrons so it has only one pickable flag, perhaps may improve performance compared to iterating
    //over all electrons to see if they are pickable?
    //Split layers before particle layer for performance
    var electronLayer = new ElectronLayerNode( model.electrons, JohnTravoltageModel.MAX_ELECTRONS, model.leg, model.arm, {
      layerSplit: true,
      pickable: false,
      peerID: options.peerIDs.status
    } );
    accessibleFormNode.addChild( electronLayer );

    // Scene description
    var accessibleDescription = new AccessibleDescriptionNode( this.arm, this.leg, model.electrons, accessibleFormNode );
    this.addChild( accessibleDescription );
    // accessibleDescription.moveToBack();

    // debug lines, body and forceline, uncomment this to view physical bounds of body
    // borders are approximately 8px = radius of particle from physical body,
    // because physical radius of electron = 1 in box2D
    if ( SHOW_DEBUG_INFO ) {
      this.showBody();

      accessibleFormNode.addChild( new Circle( 10, {
        x: model.bodyVertices[ 0 ].x,
        y: model.bodyVertices[ 0 ].y,
        fill: 'blue'
      } ) );
      accessibleFormNode.addChild( new Circle( 10, { x: 0, y: 0, fill: 'blue' } ) );

      //Debugging for finger location
      var fingerCircle = new Circle( 10, { fill: 'red' } );
      model.arm.angleProperty.link( function() {
        fingerCircle.x = model.arm.getFingerPosition().x;
        fingerCircle.y = model.arm.getFingerPosition().y;
      } );
      accessibleFormNode.addChild( fingerCircle );

      new DebugPositions().debugLineSegments( this );
    }
  }

  johnTravoltage.register( 'JohnTravoltageView', JohnTravoltageView );

  return inherit( ScreenView, JohnTravoltageView, {

    // @public, step the view
    step: function( dt ) {

      // step the sonification
      this.audioView && this.audioView.step( dt );
    },

    showBody: function() {
      //vertices and body path
      var customShape = new Shape();
      var lineSegment = null;
      for ( var i = 0; i < this.model.lineSegments.length; i++ ) {
        lineSegment = this.model.lineSegments[ i ];
        customShape.moveTo( lineSegment.x1, lineSegment.y1 );
        customShape.lineTo( lineSegment.x2, lineSegment.y2 );
      }

      //Show normals
      for ( i = 0; i < this.model.lineSegments.length; i++ ) {
        lineSegment = this.model.lineSegments[ i ];
        var center = lineSegment.center;
        var normal = lineSegment.normal.times( 50 );
        this.addChild( new Line( center.x, center.y, center.x + normal.x, center.y + normal.y, {
          lineWidth: 2,
          stroke: 'blue'
        } ) );
      }

      var path = new Path( customShape, {
        stroke: 'green',
        lineWidth: 1,
        pickable: false
      } );
      this.addChild( path );

      //forcelines, which attract particles
      var lines = this.model.forceLines;
      for ( i = 0; i < lines.length; i++ ) {
        customShape = new Shape();
        customShape.moveTo( lines[ i ].x1, lines[ i ].y1 );
        customShape.lineTo( lines[ i ].x2, lines[ i ].y2 );
        path = new Path( customShape, {
          stroke: 'red',
          lineWidth: 1,
          pickable: false,
          x: 0,
          y: 0
        } );
        this.addChild( path );
      }
    }
  } );
} );
