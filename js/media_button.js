jQuery(function($) {

    var url = ewg_data.ajax_url;
    var plugins_url = ewg_data.plugins_url;
    var shortcode = 'egallery'; // TBD replace shortcodes below
    var mediaInfo = {};

    $(document).ready(function(e){

console.log('ONE .....');
        if (ewg_data.legacy_ss == "yes") {
            console.log('Post has legacy slideshow, ignore');
            return;
        }

console.log('TWO .....');
        //preventing loss of focus
        $(document).on('focusin', function(e) {
            if ($(e.target).closest(".mce-window").length) {
                e.stopImmediatePropagation();
            }
        });
        $('#insert-my-media').click({mode: 'new'}, open_media_window);

        jQuery(document).off('click', '.dashicons-edit');
        jQuery(document).on('click', '.dashicons-edit', {mode: 'edit'}, open_media_window);

        jQuery(document).off('click', '.dashicons-no');
        jQuery(document).on('click', '.dashicons-no', delete_gallery);
console.log('THREE .....');
    });

    var extractGallery = function (contents) {

        var regex = /\[egallery ids=([^\]]*)\]/;
        var matches = regex.exec(contents);
        if (matches !== null && matches.length > 0) {
            return matches[0];
        }

        return '';
    }

    var delete_gallery = function (e) {

        var contents = tinyMCE.get("content").getContent();
        var gallery = extractGallery(contents);

        contents = contents.replace(gallery, "");
        console.log('Removing gallery: ' + gallery);
        tinyMCE.get("content").setContent(contents);
    }

    function sendSelection (mdata, object, callback) {

        var sel_msg = {
            'action': 'coll_info',
            'postid': ewg_data.post_id,
            'mdata': mdata
        };

        jQuery.post(url, sel_msg, function(response) {
            console.log('Sent selection - response: ' + response);
            var resp = JSON.parse(response);
            callback(resp.idlist, object);
        });
    }

    var open_media_window = function (e) {

        console.log('OPEN MEDIA WINDOW ...' + e.data.mode);

        var idlist = [];

        var contents = tinyMCE.get("content").getContent();
        console.log('Gallery contents: ' + contents);
        var content = extractGallery(contents);
        this.galleryContents = content;
        var regex = /\[egallery ids=([^\]]*)\]/;
        var matches = regex.exec(content);

        this.galleryMode = e.data.mode;
        if (this.galleryMode === "edit") {
            if (matches !== null && matches.length > 1) {
                var data = matches[1].replace(/['"]+/g, '');
                idlist = data.split(",");
            }
        } else { // new ...
            if (matches !== null && matches.length > 1) {
                alert("Gallery exists already, please edit");
                return false;
            }
        }

        this.window = wp.media({
                title: 'Select images for gallery',
                library: {type: 'image'},
                multiple: 'add',
                button: {text: 'Create Gallery'}
        });

        var self = this;

        if (this.galleryMode === "edit") {
            console.log('Showing select window ...');
            this.window.open();
            selectHandler(self, idlist);
        } else {
            showSavedSelection(idlist, this);
            console.log('Setting select handler ...');
            this.window.on('select', function(arg) { selectHandler(self); });
            this.window.open();
        }

        return false;
    }

    var showPanel = function (p) {

        console.log("Showing panel: " + p);
        if (p === "thumbnail") {
            jQuery("#ewg-detail-panel").hide();
            jQuery("#ewg-detail-view").show();
            jQuery("#ewg-thumbnail-panel").show();
            jQuery("#ewg-thumbnail-view").hide();
        } else {
            jQuery("#ewg-thumbnail-panel").hide();
            jQuery("#ewg-thumbnail-view").show();
            jQuery("#ewg-detail-panel").show();
            jQuery("#ewg-detail-view").hide();
        }
        console.log('T ACT?: ' + jQuery("#ewg-thumbnail-panel").is(":visible"));
        console.log('D ACT?: ' + jQuery("#ewg-detail-panel").is(":visible"));
    }

    var removePanel = function () {

        jQuery("#ewg-outer-panel").remove();
        jQuery("#ewg-panel").remove();
    }

    var createPanel = function (object, idlist, dt, panelType, refresh = false) {

        var titlePfx = 'ewg-title-' + dt;
        var captionPfx = 'ewg-caption-' + dt;
        var togglePfx = 'ewg-toggle-' + dt;
        var pId = "ewg-" + panelType + "-panel";
        console.log('Create panel: ' + panelType);
        var p;
        if (!refresh) {
            if (panelType === "thumbnail") {
                for (i = 0; i < idlist.length; i++) {
                    var id = (typeof idlist[i] === "string") ? idlist[i].trim() : idlist[i];
                    var titleId = titlePfx + '-' + id;
                    mediaInfo[titleId] = jQuery("#" + titleId).val();

                    var captId = captionPfx + '-' + id;
                    var captionObj = tinyMCE.get(captId);
                    mediaInfo[captId] = (captionObj != null) ? captionObj.getContent() : "";
                    tinymce.remove("#" + captId);
                }
            }
            jQuery("#" + pId).remove();
            var style = 'style="overflow-y:scroll;height:540px;"';
            if (panelType === "thumbnail") {
                style = 'style="overflow-y:scroll;height:540px;overflow-x:hidden;max-width:100%;"';
            }
            p = jQuery('<div id="' + pId + '" ' + style + '></div>');
            if (panelType === "thumbnail") {
                p.sortable();
            }
        } else {
            p = jQuery("#" + pId);
            p.empty();
            tinymce.remove();
        }
        p.append("<hr style='clear:left;'/>");

        for (i = 0; i < idlist.length; i++) {
            var id = (typeof idlist[i] === "string") ? idlist[i].trim() : idlist[i];
            var attObj = wp.media.attachment(id);
            attObj.fetch();
            var aaa = JSON.stringify(attObj); // TBD !!!
            var att = JSON.parse(aaa);
            var url = (att.sizes.thumbnail !== undefined) ? att.sizes.thumbnail.url : att.sizes.full.url;

            if (panelType === "detail") {
                var ida = '<div class="ewg-att" id="att-detail-' + id + '" style="padding-bottom:20px;margin-left:40px;height:400px;resize:vertical;">';

                var titleId = titlePfx + '-' + id;
                var captionId = captionPfx + '-' + id;
                var toggleId = togglePfx + '-' + id;

                var deleteId = 'ewg-delete-' + dt + '-' + id;
                var deleteTag = '#' + deleteId;
                var delButton = "<div style='width:320px;height:40px;'><button class='button-primary button-small ewg-remove-button' style='float:right;margin-bottom:10px;' id='" + deleteId + "'>Remove</button></div>";

                ida += '<div style="width:320px;margin-top:10px;margin-right:40px;margin-bottom:40px;float:right;">' + delButton + '<img style="float:right;" class="ewg-image" src="' + url + '"/></div>';
                ida += "<div style='width:60%;margin-top:5px;'><div style='margin-top:20px;'><label style='clear:left;'><b>Title</b></label></div><br/><input id=" + titleId + " style='width:100%' type='text' value=\"" + att.title + "\"/></div>";
                ida += "<div style='width:60%;margin-top:5px;'><div style='margin-top:20px;'><label style='clear:left;'><b>Caption</b></label>&nbsp;<a href='#' class='ewg-button' style='float:right;' id=" + toggleId + ">View Text</a></div><br/><div style='border:1px solid #ddd;'><textarea class='ewg-caption' id=" + captionId + " style='width:100%;' row=3>" + att.caption + "</textarea></div></div>";

                ida += "</div>";
                p.append(ida);
            } else {
                //var tnImg = '<div id="att-thumbnail-' + id + '" style="width:150px;height:150px;display:inline-block;margin:10px;border:solid 5px lightblue;border-radius:5px;"><img style="height:150px;width:150px;max-width:150px;" class="ewg-tn-image" src="' + url + '"/></div>';
                var tnImg = '<div id="att-thumbnail-' + id + '" style="width:150px;height:150px;display:inline-block;margin:10px;border:solid 5px lightblue;border-radius:5px;"><img class="center-cropped ewg-tn-image" src="' + url + '"/></div>';
                p.append(tnImg);
            }
        }

        if (!refresh) {
            p.append("<hr style='clear:left;'/>");
        }

        return p;
    }

    var refreshPanel = function (object, idlist, dt, panelType) {

        var oldMode = (panelType === "thumbnail") ? "detail" : "thumbnail";
        idlist = getIdList(oldMode);
        return createPanel(object, idlist, dt, panelType, false);
    }

    var configurePanel = function (idlist, dt, initial = false) {

        console.log('Configure panel');
        console.log('ID length: ' + idlist.length);
        console.log('IDs: ' + idlist);
        for (i = 0; i < idlist.length; i++) {
            var id = (typeof idlist[i] === "string") ? idlist[i].trim() : idlist[i];
            var titlePfx = 'ewg-title-' + dt;
            var captionPfx = 'ewg-caption-' + dt;
            var togglePfx = 'ewg-toggle-' + dt;

            var titleId = titlePfx + '-' + id;
            var captionId = captionPfx + '-' + id;
            var toggleId = togglePfx + '-' + id;
            tinymce.init({
                selector: "#" + captionId,
                menu: {},
                plugins: "tabfocus,paste,media,fullscreen,wordpress,wpeditimage,wpgallery,wplink,wpdialogs",
                toolbar: "bold italic | link unlink",
            });

            if (!initial) {
                if (captionId in mediaInfo) {
                    tinyMCE.get(captionId).setContent(mediaInfo[captionId]);
                }

                if (titleId in mediaInfo) {
                    jQuery("#" + titleId).val(mediaInfo[titleId]);
                }
            }

            (function(tId, cId) {
                jQuery("#" + tId).on('click', function(e) {
                    tinyMCE.execCommand('mceToggleEditor', false, cId);
                    jQuery(this).text(function (i, text) {
                        return text === "View Text" ? "View Styled" : "View Text";
                    });
                });
            })(toggleId, captionId);

            var deleteId = 'ewg-delete-' + dt + '-' + id;
            var deleteTag = '#' + deleteId;
            jQuery(deleteTag).off('click');
            (function(idx) {
                jQuery(deleteTag).click(function (e) {
                    var mode = getActivePanel();
                    jQuery("#att-" + mode + "-" + idx).hide('slow', function() {
                        this.remove();
                        var newlist = [];
                        for (i = 0; i < idlist.length; i++) {
                            var idc = (typeof idlist[i] === "string") ?
                                idlist[i].trim() : idlist[i];
                            if (idc === idx) {
                                idlist.splice(i, 1);
                            }
                        }
                        console.log('ID list after remove: ' + idlist);
                    });
                });
            })(id);
        }
    }

    var selectHandler = function (object, idlist) {

        console.log('Select handler invoked ... ');
        removePanel();

        if (idlist === undefined) {
            var list = object.window.state().get('selection').toJSON();
            idlist = [];
            for (i = 0; i < list.length; i++) {
                var id = list[i].id;
                idlist.push(id);
            }
        }

        var dt = Date.now();
        var backid = 'ewg-back-' + dt;
        var backtag = '#' + backid;
        var submitId = 'ewg-submit-' + dt;
        var submitTag = '#' + submitId;

        var panel = jQuery('<div id="ewg-panel"></div>');

        console.log('User selected ids: ' + idlist);

        var outerPanel = jQuery('<div id="ewg-outer-panel" style="overflow-y:hidden;height:660px;background:white;"></div>');
        var headingHtml = `
<div style="height:40px;padding-left:20px;width:100%;">
  <div style="display:table-cell;width:40%;">
    <h1>Edit Gallery</h1>
  </div>
  <div style="display:table-cell;width:60%;padding-left:30px;">
    <a href="#" id="ewg-thumbnail-view" style="font-size:10pt;">Switch to Tile View</a>
    &nbsp;
    <a href="#" id="ewg-detail-view" style="font-size:10pt;">Switch to Details View</a>
  </div>
</div>'
`;
        var header = jQuery(headingHtml);

        var buttonTitle = (object.galleryMode === "edit") ? "Update Gallery" : "Insert Gallery";

        var footer = jQuery("<div style='padding-top:10px;padding-right:20px;bottom:0px;height:60px;'><button class='button-primary button-large' style='margin-left:10px;float:right;' id='" + submitId + "'>" + buttonTitle + "</button><button id='" + backid + "' class='button-primary button-large' style='margin-left:10px;float:right;'>Add Images</button></div>");

        var tnPanel = createPanel(object, idlist, dt, "thumbnail");
        panel.append(tnPanel);

        var dtPanel = createPanel(object, idlist, dt, "detail");
        panel.append(dtPanel);

        outerPanel.append(header);
        outerPanel.append(panel);
        outerPanel.append(footer);

        jQuery(".media-modal-content").replaceWith(outerPanel);
        showPanel("detail");
        //showPanel("thumbnail");

        var thumbnailView = jQuery("#ewg-thumbnail-view");
        thumbnailView.off('click');
        thumbnailView.on('click', function(e) {
            var newPanel = refreshPanel(object, idlist, dt, "thumbnail");
            panel.append(newPanel);
            showPanel("thumbnail");
        });

        var detailView = jQuery("#ewg-detail-view");
        detailView.off('click');
        detailView.on('click', function(e) {
            var pId = "#ewg-detail-panel";
            //panel.remove(jQuery(pId));
            jQuery(pId).remove();
            var newPanel = refreshPanel(object, idlist, dt, "detail");
            panel.append(newPanel);
            configurePanel(idlist, dt);
            showPanel("detail");
        });

        configurePanel(idlist, dt, true);

        console.log('Setting back handler with idlist: ' + idlist);
        jQuery(backtag).off('click');
        jQuery(backtag).click(function(e) { backHandler(idlist, object); });

        jQuery(submitTag).off('click');
        jQuery(submitTag).click(function(e) { submitHandler(dt, object); });

        object.window.open();
    }

    var getActivePanel = function () {

        if (jQuery("#ewg-thumbnail-panel").is(":visible")) {
            return "thumbnail";
        } else if (jQuery("#ewg-detail-panel").is(":visible")) {
            return "detail";
        }

        return "";
    }

    var getIdList = function (mode) {

        var idlist = [];
        divlist = jQuery("#ewg-" + mode + "-panel").children("div[id]");
        for (i = 0; i < divlist.length; i++) {
            var newId = divlist[i].id.replace("att-" + mode + "-", "");
            idlist.push(newId);
        }

        return idlist;
    }

    var submitHandler = function (dt, object) {

        var mode = getActivePanel();
        var idlist = [];
        divlist = jQuery("#ewg-" + mode + "-panel").children("div[id]");
        for (i = 0; i < divlist.length; i++) {
            var newId = divlist[i].id.replace("att-" + mode + "-", "");
            idlist.push(newId);
        }

        var mdata = [];
        for (i = 0; i < idlist.length; i++) {
            var id = (typeof idlist[i] === "string") ? idlist[i].trim() : idlist[i];
            console.log('SUBMIT ID: ' + id);

            var titleId = 'ewg-title-' + dt + '-' + id;
            var title = jQuery("#" + titleId).val();
            console.log(dt + ": title: " + title);
            title = (title !== undefined) ? title : "";

            var captionId = 'ewg-caption-' + dt + '-' + id;
            var captionObj = tinyMCE.get(captionId);
            var caption = (captionObj != null) ? captionObj.getContent() : "";

            console.log(dt + ": caption: " + caption);

            mdata.push({"att": id, "title": title, "caption": caption});
        }

        sendSelection(mdata, object, function(idlist, object) {

            var gallerySC = '[egallery ids="' + idlist + '"]';
            console.log('GALLERY SC: ' + gallerySC);
            if (object.galleryMode === "new") {
                var contents = tinyMCE.get("content").getContent();
                console.log('New: Original contents: ' + contents);
                tinyMCE.get("content").setContent(contents + "<p>" + gallerySC);
            } else {
                var contents = tinyMCE.get("content").getContent();
                console.log('Edit: Original contents: ' + contents);
                var gallery = extractGallery(contents);
                console.log('Replacing: ' + gallery + ' with ' + gallerySC);
                contents = contents.replace(gallery, gallerySC);
                tinyMCE.get("content").setContent(contents);
                console.log('Loaded edited gallery: ' + contents);
            }
        });

        removePanel();
        object.window.close();
        return false;
    }

    var backHandler = function (idlist, object) {

        console.log('Back handler invoked with idlist: ' + idlist);

        object.window.close();
        object.window = wp.media({
                        title: 'Select images for gallery',
                        library: {type: 'image'},
                        multiple: 'add',
                        button: {text: 'Create Gallery'}
        });

        console.log('Setting select handler ...');
        object.window.on('select', function(arg) { selectHandler(object); });
        console.log('Saved for selection: ' + idlist);
        showSavedSelection(idlist, object);
        removePanel();
        object.window.open();
    }

    var showSavedSelection = function (idlist, object) {

        console.log('Setting OPEN handler with idlist: ' + idlist);
        if (idlist === undefined) {
            return;
        }

        var callback = function () {
            console.log('Showing saved selection with idlist: ' + idlist);
            var selection = object.window.state().get('selection')
            for (i = 0; i < idlist.length; i++) {
                id = (typeof idlist[i] === "string") ? idlist[i].trim() : idlist[i];
                console.log('Preselecting id: ' + id);
                var attachment = wp.media.attachment(id);
                attachment.fetch();
                selection.add(attachment);
            }
        }

        object.window.on('open', callback);
    }
});
