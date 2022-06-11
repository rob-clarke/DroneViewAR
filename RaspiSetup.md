Setup steps on RasPi 4

### 1. Install a 64-bit version of Raspbian

### 2. Install Docker: https://docs.docker.com/engine/install/debian/

> Setup instructions for AP host are from: https://thepi.io/how-to-use-your-raspberry-pi-as-a-wireless-access-point/

### 3. Disable serial console
`sudo raspi-config`

-> Interface options

-> Serial Port

Login shell? No

Hardware enabled? Yes

### 4. Install hostapd & dnsmasq

```sh
sudo apt install hostapd dnsmasq
```

### 5. Configure interface

Edit `/etc/dhcpcd.conf`. Add:
```
# Setup static IP for wlan0
interface wlan0
static ip_address=192.168.111.1/24
```

### 6. Configure DHCP server

Edit dnsmasq config:
```
sudo mv /etc/dnsmasq.conf{,.orig}
sudo nano /etc/dnsmasq.conf
```

Contents:
```
interface=wlan0
  dhcp-range=192.168.111.2,192.168.111.100,255.255.255.0,24h
```

### 7. Configure access point setup
Edit hostapd config: `nano /etc/hostapd/hostapd.conf`
```
interface=wlan0
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
ssid=DroneViewAR
wpa_passphrase=hololens
```

Edit /etc/default/hostapd

Add `DAEMON_CONF="/etc/hostapd/hostapd.conf"`


## Other notes

USB RNDIS driver for windows may be available from here: https://www.catalog.update.microsoft.com/Search.aspx?q=usb%5Cvid_0525%26pid_a4a2

Use the Acer one...
