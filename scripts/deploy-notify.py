import os
import subprocess
import sys
import tkinter as tk

from tkinter import messagebox

SSH_KEY = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/.ssh/id_ed25519")
VPS_HOST = "root@2.24.124.93"
DEPLOY_CMD = "cd /var/www/thessara && bash deploy/vps/deploy.sh"










def run_deploy():
    ssh_cmd = [
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "ConnectTimeout=10",
        "-i", SSH_KEY,
        VPS_HOST,
        DEPLOY_CMD,
    ]

    process = subprocess.Popen(
        ssh_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    output_lines = []
    last_line = ""
    for line in process.stdout:
        print(line.encode(sys.stdout.encoding, errors="replace").decode(sys.stdout.encoding), end="")
        output_lines.append(line)
        stripped = line.strip()
        if stripped:
            last_line = stripped

    exit_code = process.wait()
    full_output = "".join(output_lines)

    return exit_code, last_line, full_output

def show_popup(exit_code, last_line):
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)

    if exit_code == 0 and "finalizado" in last_line.lower():
        messagebox.showinfo(
            "\u2705 Thessara Deploy - Sucesso",
            f"Deploy conclu\u00eddo com sucesso!\n\n\u00daltima linha:\n{last_line}",
        )
    else:
        messagebox.showerror(
            "\u274c Thessara Deploy - Erro",
            f"Deploy FALHOU (c\u00f3digo {exit_code}).\n\n\u00daltima linha:\n{last_line}",
        )
    root.destroy()

if __name__ == "__main__":
    print("=" * 50)
    print("  Thessara Deploy")
    print("=" * 50)
    exit_code, last_line, _ = run_deploy()
    show_popup(exit_code, last_line)
    sys.exit(exit_code)
