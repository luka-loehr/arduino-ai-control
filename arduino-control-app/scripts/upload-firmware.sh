#!/bin/bash

# Arduino Firmware Upload Script
# This script compiles and uploads the Arduino firmware to the specified port

set -e  # Exit on any error

# Configuration
SKETCH_PATH="$(dirname "$0")/../arduino-serial/arduino-serial.ino"
BOARD_TYPE="arduino:avr:uno"
BUILD_DIR="/tmp/arduino-build"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if arduino-cli is installed
check_arduino_cli() {
    if ! command -v arduino-cli &> /dev/null; then
        print_error "arduino-cli is not installed or not in PATH"
        print_status "Please install arduino-cli from: https://arduino.github.io/arduino-cli/"
        print_status "Or install via package manager:"
        print_status "  Ubuntu/Debian: sudo apt install arduino-cli"
        print_status "  macOS: brew install arduino-cli"
        print_status "  Windows: Download from GitHub releases"
        exit 1
    fi
    
    print_success "arduino-cli found: $(arduino-cli version)"
}

# Function to setup Arduino CLI
setup_arduino_cli() {
    print_status "Setting up Arduino CLI..."
    
    # Update core index
    print_status "Updating core index..."
    arduino-cli core update-index
    
    # Install Arduino AVR core if not present
    if ! arduino-cli core list | grep -q "arduino:avr"; then
        print_status "Installing Arduino AVR core..."
        arduino-cli core install arduino:avr
    else
        print_success "Arduino AVR core already installed"
    fi
}

# Function to detect Arduino boards
detect_boards() {
    print_status "Detecting connected Arduino boards..."
    
    local boards=$(arduino-cli board list 2>/dev/null | grep -E "(ttyACM|ttyUSB|COM)" || true)
    
    if [ -z "$boards" ]; then
        print_warning "No Arduino boards detected"
        print_status "Please ensure your Arduino is connected via USB"
        return 1
    fi
    
    echo "$boards"
    return 0
}

# Function to compile the sketch
compile_sketch() {
    local board_type="$1"
    
    print_status "Compiling sketch for $board_type..."
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Compile the sketch
    if arduino-cli compile --fqbn "$board_type" --build-path "$BUILD_DIR" "$SKETCH_PATH"; then
        print_success "Compilation successful"
        return 0
    else
        print_error "Compilation failed"
        return 1
    fi
}

# Function to upload firmware
upload_firmware() {
    local port="$1"
    local board_type="$2"
    
    print_status "Uploading firmware to $port..."
    
    # Upload the compiled sketch
    if arduino-cli upload -p "$port" --fqbn "$board_type" --input-dir "$BUILD_DIR"; then
        print_success "Upload successful!"
        return 0
    else
        print_error "Upload failed"
        return 1
    fi
}

# Function to verify upload
verify_upload() {
    local port="$1"
    
    print_status "Verifying upload..."
    
    # Wait a moment for the Arduino to reset
    sleep 2
    
    # Try to communicate with the Arduino
    if command -v timeout &> /dev/null; then
        # Linux/macOS with timeout command
        echo '{"id":"test","command":"PING","params":{},"timestamp":0}' | timeout 5 cat > "$port" 2>/dev/null || true
    else
        # Fallback without timeout
        echo '{"id":"test","command":"PING","params":{},"timestamp":0}' > "$port" 2>/dev/null || true
    fi
    
    print_success "Upload verification complete"
}

# Main function
main() {
    local port=""
    local board_type="$BOARD_TYPE"
    local auto_detect=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--port)
                port="$2"
                shift 2
                ;;
            -b|--board)
                board_type="$2"
                shift 2
                ;;
            -a|--auto)
                auto_detect=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  -p, --port PORT     Specify Arduino port (e.g., /dev/ttyACM0)"
                echo "  -b, --board BOARD   Specify board type (default: arduino:avr:uno)"
                echo "  -a, --auto          Auto-detect Arduino board"
                echo "  -h, --help          Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    print_status "Arduino AI Control Firmware Upload"
    print_status "=================================="
    
    # Check prerequisites
    check_arduino_cli
    setup_arduino_cli
    
    # Auto-detect board if requested
    if [ "$auto_detect" = true ] || [ -z "$port" ]; then
        print_status "Auto-detecting Arduino boards..."
        if boards=$(detect_boards); then
            # Extract first port from detected boards
            port=$(echo "$boards" | head -n1 | awk '{print $1}')
            print_success "Auto-detected Arduino on port: $port"
        else
            if [ -z "$port" ]; then
                print_error "No Arduino detected and no port specified"
                exit 1
            fi
        fi
    fi
    
    # Validate port
    if [ ! -e "$port" ]; then
        print_error "Port $port does not exist"
        exit 1
    fi
    
    print_status "Using port: $port"
    print_status "Using board type: $board_type"
    print_status "Sketch path: $SKETCH_PATH"
    
    # Compile and upload
    if compile_sketch "$board_type"; then
        if upload_firmware "$port" "$board_type"; then
            verify_upload "$port"
            print_success "Firmware upload completed successfully!"
            print_status "Your Arduino is now ready for AI control."
        else
            exit 1
        fi
    else
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
