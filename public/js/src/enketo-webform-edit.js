import $ from 'jquery';
import gui from './module/gui';
import controller from './module/controller-webform';
import settings from './module/settings';
import connection from './module/connection';
import { init as initTranslator, t, localize } from './module/translator';
import utils from './module/utils';


const $loader = $( '.main-loader' );
const $formheader = $( '.main > .paper > .form-header' );
const survey = {
    enketoId: settings.enketoId,
    instanceId: settings.instanceId,
};

initTranslator( survey )
    .then( survey => Promise.all( [
        connection.getFormParts( survey ),
        connection.getExistingInstance( survey )
    ] ) )
    .then( responses => {
        const formParts = responses[ 0 ];
        formParts.instance = responses[ 1 ].instance;
        formParts.instanceAttachments = responses[ 1 ].instanceAttachments;

        if ( formParts.form && formParts.model && formParts.instance ) {
            return gui.swapTheme( formParts );
        } else {
            throw new Error( t( 'error.unknown' ) );
        }
    } )
    .then( _init )
    .then( connection.getMaximumSubmissionSize )
    .then( _updateMaxSizeSetting )
    .catch( _showErrorOrAuthenticate );

function _updateMaxSizeSetting( maxSize ) {
    if ( maxSize ) {
        // overwrite default max size
        settings.maxSize = maxSize;
        $( 'form.or' ).trigger( 'updateMaxSize' );
    }
}

function _showErrorOrAuthenticate( error ) {
    $loader.addClass( 'fail' );
    if ( error.status === 401 ) {
        window.location.href = `${settings.loginUrl}?return_url=${encodeURIComponent( window.location.href )}`;
    } else {
        gui.alert( error.message, t( 'alert.loaderror.heading' ) );
    }
}

function _init( formParts ) {
    const initialForm = controller.buildInitialForm(formParts);
    $formheader.after( initialForm );
    const formId = initialForm.id;
    localize( document.querySelector( 'form.or' ) );
    $( document ).ready( () => {
        controller.init( 'form.or:eq(0)', {
            modelStr: formParts.model,
            instanceStr: formParts.instance,
            external: formParts.externalData,
            instanceAttachments: formParts.instanceAttachments,
        } ).then( () => {
            $( 'head>title' ).text( utils.getTitleFromFormStr( formParts.form ) );
        } );
    } );

    $("#"+formId).on('formUpdate', function() {
        controller.init( 'form.or:eq(0)', {
            modelStr: formParts.model,
            instanceStr: controller.getCurrentForm(),
            external: formParts.externalData,
            instanceAttachments: [], //need to handle files
            // instanceAttachments: localStorage.getItem('currentFiles') ? JSON.parse(localStorage.getItem('currentFiles')) : [], //need to handle files
        } ).then( () => {
            $( 'head>title' ).text( utils.getTitleFromFormStr( formParts.form ) );
            if (localStorage.getItem('moving') === 'backward') {
                controller.goToLastPage();
            }
            // let currentFiles = controller.getCurrentFiles();
            // if (currentFiles.length > 0) {
            //     if (localStorage.getItem('currentFiles')){
            //         let existingFiles = JSON.parse(localStorage.getItem('currentFiles'));
            //         currentFiles = existingFiles.concat(currentFiles)
            //     }
            //     localStorage.setItem('currentFiles', JSON.stringify(currentFiles))
            // }
        } );
    });
}
