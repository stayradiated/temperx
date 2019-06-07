package main

import (
	"fmt"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"github.com/zserge/hid"
	"log"
	"os"
	"time"
)

var (
	rootCmd = &cobra.Command{
		Use: "temperx",
		Long: "Show temperature as measured by " +
			"TEMPerX USB devices (ID 413d:2107)",
		Run: func(cmd *cobra.Command, args []string) {
			output()
		},
	}

	home    = os.Getenv("HOME")
	tf      float64
	to      float64
	conf    string
	verbose bool
)

func main() {
	rootCmd.Flags().Float64Var(&tf, "tf", 1, "Factor for temperature")
	rootCmd.Flags().Float64Var(&to, "to", 0, "Offset for temperature")
	rootCmd.Flags().StringVarP(&conf, "conf", "c", home+"/.temperx.toml", "Configuration file")
	rootCmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "Verbose output")
	viper.BindPFlag("tf", rootCmd.Flags().Lookup("tf"))
	viper.BindPFlag("to", rootCmd.Flags().Lookup("to"))

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func output() {
	if conf != "" {
		if verbose == true {
			fmt.Println("Trying to read configuration from:", conf)
		}
		viper.SetConfigFile(conf)
		viper.ReadInConfig()
	}

	tf := viper.GetFloat64("tf")
	to := viper.GetFloat64("to")
	hid_path := "413d:2107:0000:01"
	cmd_raw := []byte{0x01, 0x80, 0x33, 0x01, 0x00, 0x00, 0x00, 0x00}

	if verbose == true {
		fmt.Println("Using the following factors and offsets:")
		fmt.Println("tf:", tf)
		fmt.Println("to:", to)
	}

	hid.UsbWalk(func(device hid.Device) {
		info := device.Info()
		id := fmt.Sprintf("%04x:%04x:%04x:%02x", info.Vendor, info.Product, info.Revision, info.Interface)
		if id != hid_path {
			return
		}

		if err := device.Open(); err != nil {
			log.Println("Open error: ", err)
			return
		}

		defer device.Close()

		if _, err := device.Write(cmd_raw, 1*time.Second); err != nil {
			log.Println("Output report write failed:", err)
			return
		}

		if buf, err := device.Read(-1, 1*time.Second); err == nil {
			tmp := (float64(buf[2])*256+float64(buf[3]))/100*tf + to
			fmt.Printf("%v\n", tmp)
		}
	})
}
