package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"berty.tech/go/internal/banner"
	_ "berty.tech/go/internal/buildconstraints" // fail if bad go version
	"berty.tech/go/pkg/bertychat"
	"berty.tech/go/pkg/bertyprotocol"
	"berty.tech/go/pkg/errcode"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/sqlite" // required by gorm
	"github.com/peterbourgon/ff"
	"github.com/peterbourgon/ff/ffcli"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	log.SetFlags(0)

	var (
		logger            *zap.Logger
		globalFlags       = flag.NewFlagSet("bertychat", flag.ExitOnError)
		globalDebug       = globalFlags.Bool("debug", false, "debug mode")
		bannerFlags       = flag.NewFlagSet("banner", flag.ExitOnError)
		bannerLight       = bannerFlags.Bool("light", false, "light mode")
		clientFlags       = flag.NewFlagSet("client", flag.ExitOnError)
		clientProtocolURN = clientFlags.String("protocol-urn", ":memory:", "protocol sqlite URN")
		clientChatURN     = clientFlags.String("chat-urn", ":memory:", "chat sqlite URN")
	)

	globalPreRun := func() error {
		rand.Seed(time.Now().UnixNano())
		if *globalDebug {
			config := zap.NewDevelopmentConfig()
			config.Level.SetLevel(zap.DebugLevel)
			config.DisableStacktrace = true
			config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
			var err error
			logger, err = config.Build()
			if err != nil {
				return errcode.TODO.Wrap(err)
			}
			logger.Debug("logger initialized in debug mode")
		} else {
			config := zap.NewDevelopmentConfig()
			config.Level.SetLevel(zap.InfoLevel)
			config.DisableStacktrace = true
			config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
			var err error
			logger, err = config.Build()
			if err != nil {
				return errcode.TODO.Wrap(err)
			}
		}
		return nil
	}

	banner := &ffcli.Command{
		Name:    "banner",
		Usage:   "banner",
		FlagSet: bannerFlags,
		Exec: func(args []string) error {
			if err := globalPreRun(); err != nil {
				return err
			}
			if *bannerLight {
				fmt.Println(banner.QOTD())
			} else {
				fmt.Println(banner.OfTheDay())
			}
			return nil
		},
	}

	version := &ffcli.Command{
		Name:  "version",
		Usage: "version",
		Exec: func(args []string) error {
			fmt.Println("dev")
			return nil
		},
	}

	daemon := &ffcli.Command{
		Name:    "daemon",
		Usage:   "daemon",
		FlagSet: clientFlags,
		Exec: func(args []string) error {
			if err := globalPreRun(); err != nil {
				return err
			}

			ctx := context.Background()

			// protocol
			var protocol bertyprotocol.Client
			{
				// initialize sqlite3 gorm database
				db, err := gorm.Open("sqlite3", *clientProtocolURN)
				if err != nil {
					return errcode.TODO.Wrap(err)
				}
				defer db.Close()

				// initialize new protocol client
				opts := bertyprotocol.Opts{
					Logger: logger.Named("bertyprotocol"),
				}
				protocol, err = bertyprotocol.New(db, opts)
				if err != nil {
					return errcode.TODO.Wrap(err)
				}

				defer protocol.Close()
			}

			// chat
			var chat bertychat.Client
			{
				// initialize sqlite3 gorm database
				db, err := gorm.Open("sqlite3", *clientChatURN)
				if err != nil {
					return errcode.TODO.Wrap(err)
				}
				defer db.Close()

				// initialize bertychat client
				chatOpts := bertychat.Opts{
					Logger: logger.Named("bertychat"),
				}
				chat, err = bertychat.New(db, protocol, chatOpts)
				if err != nil {
					return errcode.TODO.Wrap(err)
				}

				defer chat.Close()
			}

			info, err := protocol.AccountGetInformation(ctx, nil)
			if err != nil {
				return errcode.TODO.Wrap(err)
			}

			logger.Info("client initialized", zap.String("peer-id", info.PeerID), zap.Strings("listeners", info.Listeners))
			return nil
		},
	}

	root := &ffcli.Command{
		Usage:       "bertychat [global flags] <subcommand> [flags] [args...]",
		FlagSet:     globalFlags,
		Options:     []ff.Option{ff.WithEnvVarPrefix("BERTY")},
		Subcommands: []*ffcli.Command{daemon, banner, version},
		Exec: func([]string) error {
			globalFlags.Usage()
			return flag.ErrHelp
		},
	}

	if err := root.Run(os.Args[1:]); err != nil {
		log.Fatalf("error: %v", err)
	}
}
