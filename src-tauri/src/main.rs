// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Work around WebKitGTK DMA-BUF renderer issues on non-Ubuntu Linux distros
    // (e.g. Arch/Manjaro with Intel iGPU). Must be set before WebKitGTK initializes.
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    drawfinity_lib::run()
}
