use std::sync::Mutex;
use sysinfo::{Networks, System};

struct AppState {
    system: Mutex<System>,
    networks: Mutex<Networks>,
}

#[derive(serde::Serialize)]
struct SystemStats {
    /// Overall CPU usage as a percentage (0–100)
    cpu_percent: f32,
    /// Bytes received across all non-loopback interfaces since last call
    net_rx_bytes: u64,
    /// Bytes transmitted across all non-loopback interfaces since last call
    net_tx_bytes: u64,
}

#[tauri::command]
fn get_system_stats(state: tauri::State<'_, AppState>) -> SystemStats {
    let mut sys = state.system.lock().unwrap();
    sys.refresh_cpu_usage();
    let cpu_percent = sys.global_cpu_usage();

    let mut nets = state.networks.lock().unwrap();
    nets.refresh();
    let (rx, tx) = nets
        .iter()
        .filter(|(name, _)| !name.starts_with("lo"))
        .fold((0u64, 0u64), |(rx, tx), (_, n)| {
            (rx + n.received(), tx + n.transmitted())
        });

    SystemStats {
        cpu_percent,
        net_rx_bytes: rx,
        net_tx_bytes: tx,
    }
}

#[tauri::command]
async fn shutdown_app(app: tauri::AppHandle) {
    println!("Shutting down OpenMind...");
    app.exit(0);
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        system: Mutex::new(System::new()),
        networks: Mutex::new(Networks::new_with_refreshed_list()),
    };

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, shutdown_app, get_system_stats])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
