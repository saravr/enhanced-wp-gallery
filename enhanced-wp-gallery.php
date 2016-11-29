<?php
/*
 * Plugin Name: Enhanced Wordpress Gallery
 * Description: Plugin for Enhanced Wordpress Gallery
 * Author: Sarav R
 * Version: 0.1
 */

class EnhancedWPGallery {

    private static $instance = null;
    private static $shortcode = 'egallery';

    public static function get_instance() {

        if (null == self::$instance) {
            self::$instance = new self;
        }

        return self::$instance;
    }

    private function __construct() {
        
        register_activation_hook(__FILE__, array($this, 'jal_install'));

        add_action('wp_enqueue_media', array($this, 'include_media_button_js_file'));
        add_action('media_buttons', array($this, 'add_my_media_button'));
        add_action('wp_ajax_coll_info', array($this, 'coll_info_callback'));

        add_filter('mce_external_plugins', array($this ,'ewg_mce_external_plugins'));
        add_filter('mce_buttons', array($this, 'ewg_mce_buttons'));
    }

    function ewg_mce_external_plugins($plugin_array) {

        $plugin_array[self::$shortcode] = plugins_url('js/mce-button.js', __FILE__);
        return $plugin_array;
    }

    function ewg_mce_buttons($buttons) {

        array_push($buttons, self::$shortcode);
        return $buttons;
    }

    function ewg_shortcode ($atts, $content = null) {
        return "<div>Placeholder</div>"; // TBD
    }

    function include_media_button_js_file () {
        global $post;

        $postid = isset($post->ID) ? $post->ID : 0;

        wp_enqueue_script('media_button', plugins_url('js/media_button.js', __FILE__),
            array('jquery'), '1.0', true);
        wp_localize_script('media_button', 'ewg_data',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'post_id' => $postid
            ));
    }

    function add_my_media_button () {
        echo '<a href="#" id="insert-my-media" class="button">Build Gallery</a>';
    }

    function coll_info_callback () {

        $postid = $_POST['postid'];
        $mdata = $_POST['mdata'];
        error_log($postid . ': Gallery collection: ' . print_r($mdata, 1));

        wp_die();
    }

    private function indcap_get_table_name () {
        global $wpdb;

        return $wpdb->prefix . "indcaps";
    }

    function jal_install () {
        global $wpdb;

        $table_name = $this->indcap_get_table_name();
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") == $table_name) {
            error_log('DBG: Table exists already: ' . $table_name);
            return;
        }

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
          timestamp TIMESTAMP NOT NULL,
          id bigint(20) NOT NULL PRIMARY KEY AUTO_INCREMENT,
          postid bigint(20) unsigned NOT NULL,
          attid bigint(20) unsigned NOT NULL,
          title varchar(512),
          caption varchar(1024)
        ) $charset_collate;";

        error_log('DBG: Creating table with SQL: ' . $sql);
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        add_option('jal_db_version', '1.0');
    }

    private function gr_save_media_info ($postid, $attid, $title, $caption) {
        global $wpdb;

        yp_log($postid, 'Saving media info for attid: ' . $attid);

        $table_name = $this->indcap_get_table_name();
        $cond = 'postid = "' . $postid . '" AND attid = ' . $attid;
        $sql = 'SELECT attid FROM ' . $table_name . ' WHERE ' . $cond;
        $res = $wpdb->get_results($sql, OBJECT);
        if (count($res) > 0) {
            $res = $wpdb->update(
                $table_name,
                array(
                    'timestamp' => current_time('mysql'),
                    'title' => $title,
                    'caption' => $caption
                ),
                array(
                    'postid' => $postid,
                    'attid' => $attid
                )
            );
            if ($res > 0) {
                error_log('DBG: Successfully updated record for attid' . $attid);
            } else {
                error_log('DBG: Failed update attid: ' . $attid . ', ' . $wpdb->last_query);
            }
        } else { // insert ...
            $res = $wpdb->insert(
                $table_name,
                array(
                    'timestamp' => current_time('mysql'),
                    'postid' => $postid,
                    'attid' => $attid,
                    'title' => $title,
                    'caption' => $caption
                )
            );
            if ($res > 0) {
                error_log('DBG: Successfully inserted record for attid ' . $attid);
            } else {
                error_log('DBG: Failed to insert record for attid ' . $attid);
            }
        }
    }

    // For future use
    function media_info_callback () {

        $postid = $_POST['postid'];
        $value = $_POST['value'];
        yp_log($postid, ': Media Info: ' . print_r($value, 1));

        foreach ($value as $att) {
            $this->gr_save_media_info($postid, $att['attid'], $att['title'], $att['caption']);
        }

        wp_die();
    }
}

EnhancedWPGallery::get_instance();

