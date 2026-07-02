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
    /// Total physical memory in bytes
    mem_total_bytes: u64,
    /// Free physical memory in bytes (approximates what Ollama checks when loading a model)
    mem_free_bytes: u64,
    /// Available physical memory in bytes (includes reclaimable cache)
    mem_available_bytes: u64,
}

#[tauri::command]
fn get_system_stats(state: tauri::State<'_, AppState>) -> SystemStats {
    let mut sys = state.system.lock().unwrap();
    sys.refresh_cpu_usage();
    sys.refresh_memory();
    let cpu_percent = sys.global_cpu_usage();
    let mem_total_bytes = sys.total_memory();
    let mem_free_bytes = sys.free_memory();
    let mem_available_bytes = sys.available_memory();

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
        mem_total_bytes,
        mem_free_bytes,
        mem_available_bytes,
    }
}

/// Run one of the bundled diagnostics shell scripts and return stdout+stderr.
/// Only the three known scripts are allowed to prevent arbitrary execution.
#[tauri::command]
async fn run_diagnostic_script(script: String) -> Result<String, String> {
    const ALLOWED: &[&str] = &[
        "test-opencode-ollama.sh",
        "curlllama.sh",
        "sync-ollama-models.sh",
    ];
    if !ALLOWED.contains(&script.as_str()) {
        return Err(format!("Script '{}' is not in the allowed list", script));
    }

    // CARGO_MANIFEST_DIR is src-tauri/; parent is the project root.
    let project_root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    let script_path = project_root.join("diagnostics").join(&script);

    tauri::async_runtime::spawn_blocking(move || {
        let output = std::process::Command::new("bash")
            .arg(&script_path)
            .current_dir(&project_root)
            .output()
            .map_err(|e| format!("Failed to launch script: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        let mut result = stdout;
        if !stderr.is_empty() {
            if !result.is_empty() {
                result.push('\n');
            }
            result.push_str("--- stderr ---\n");
            result.push_str(&stderr);
        }
        Ok(result)
    })
    .await
    .map_err(|e| e.to_string())?
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
        .invoke_handler(tauri::generate_handler![greet, shutdown_app, get_system_stats, run_diagnostic_script])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
