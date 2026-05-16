#!/usr/bin/env python3
"""
Simulate Ctrl+V via /dev/uinput (works on GNOME Wayland).
Usage: python3 paste_helper.py [--shift]
"""
import struct, os, sys, time, fcntl

UINPUT = '/dev/uinput'
UI_SET_EVBIT  = 0x40045564
UI_SET_KEYBIT = 0x40045565
UI_DEV_SETUP  = 0x405c5503
UI_DEV_CREATE = 0x5501
UI_DEV_DESTROY= 0x5502

EV_SYN = 0x00
EV_KEY = 0x01
SYN_REPORT = 0x00
KEY_LEFTCTRL = 29
KEY_LEFTSHIFT = 42
KEY_V = 47

def write_event(fd, etype, code, value):
    t = time.time()
    sec = int(t)
    usec = int((t - sec) * 1e6)
    os.write(fd, struct.pack('llHHi', sec, usec, etype, code, value))

def main():
    with_shift = '--shift' in sys.argv

    try:
        fd = os.open(UINPUT, os.O_WRONLY | os.O_NONBLOCK)
    except PermissionError:
        print("ERROR: Cannot access /dev/uinput")
        sys.exit(1)

    # Set capabilities
    fcntl.ioctl(fd, UI_SET_EVBIT, EV_KEY)
    fcntl.ioctl(fd, UI_SET_KEYBIT, KEY_LEFTCTRL)
    fcntl.ioctl(fd, UI_SET_KEYBIT, KEY_LEFTSHIFT)
    fcntl.ioctl(fd, UI_SET_KEYBIT, KEY_V)

    # Device setup
    name = b'pardus-paste\x00' + b'\x00' * 67  # 80 bytes
    setup = struct.pack('<HHHH80sI', 0x03, 0x01, 0x01, 1, name, 0)
    fcntl.ioctl(fd, UI_DEV_SETUP, setup)
    fcntl.ioctl(fd, UI_DEV_CREATE)

    # CRITICAL: Wait for compositor to recognize the new input device
    time.sleep(0.3)

    # Press Ctrl
    write_event(fd, EV_KEY, KEY_LEFTCTRL, 1)
    write_event(fd, EV_SYN, SYN_REPORT, 0)
    time.sleep(0.02)

    # Press Shift if needed
    if with_shift:
        write_event(fd, EV_KEY, KEY_LEFTSHIFT, 1)
        write_event(fd, EV_SYN, SYN_REPORT, 0)
        time.sleep(0.02)

    # Press and release V
    write_event(fd, EV_KEY, KEY_V, 1)
    write_event(fd, EV_SYN, SYN_REPORT, 0)
    time.sleep(0.03)
    write_event(fd, EV_KEY, KEY_V, 0)
    write_event(fd, EV_SYN, SYN_REPORT, 0)
    time.sleep(0.02)

    # Release Shift
    if with_shift:
        write_event(fd, EV_KEY, KEY_LEFTSHIFT, 0)
        write_event(fd, EV_SYN, SYN_REPORT, 0)
        time.sleep(0.02)

    # Release Ctrl
    write_event(fd, EV_KEY, KEY_LEFTCTRL, 0)
    write_event(fd, EV_SYN, SYN_REPORT, 0)

    # Wait for events to be processed before destroying device
    time.sleep(0.1)
    fcntl.ioctl(fd, UI_DEV_DESTROY)
    os.close(fd)
    print("OK")

if __name__ == '__main__':
    main()
