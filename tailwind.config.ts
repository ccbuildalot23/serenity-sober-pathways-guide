import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Therapeutic colors
				sage: {
					50: '#f0f7f4',
					100: '#e0efe8',
					200: '#c2dfd1',
					300: '#a3cfba',
					400: '#85bfa3',
					500: '#66af8c',
					600: '#529670',
					700: '#3d7d54',
					800: '#296438',
					900: '#144b1c',
				},
				sky: {
					50: '#f0f9ff',
					100: '#e0f2fe',
					200: '#bae6fd',
					300: '#7dd3fc',
					400: '#38bdf8',
					500: '#0ea5e9',
					600: '#0284c7',
					700: '#0369a1',
					800: '#075985',
					900: '#0c4a6e',
				},
				sand: {
					50: '#fdf8f3',
					100: '#fbf0e4',
					200: '#f7dfc8',
					300: '#f2c9a1',
					400: '#eaad72',
					500: '#e2924f',
					600: '#d87a3f',
					700: '#b56135',
					800: '#914c31',
					900: '#763e29',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				soft: '0.75rem',
				medium: '1rem',
				large: '1.5rem',
				xl: '2rem',
				organic: '40% 60% 60% 40% / 60% 40% 60% 40%'
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'120': '30rem',
				'128': '32rem',
				'144': '36rem'
			},
			boxShadow: {
				'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
				'medium': '0 4px 16px rgba(0, 0, 0, 0.1)',
				'large': '0 8px 32px rgba(0, 0, 0, 0.12)',
				'glow': '0 0 20px rgba(102, 175, 140, 0.2)',
				'glow-lg': '0 0 40px rgba(102, 175, 140, 0.3)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
                                'accordion-up': {
                                        from: {
                                                height: 'var(--radix-accordion-content-height)'
                                        },
                                        to: {
                                                height: '0'
                                        }
                                },
                                slideInRight: {
                                        '0%': { transform: 'translateX(100%)', opacity: '0' },
                                        '100%': { transform: 'translateX(0)', opacity: '1' }
                                },
                                calendarPulse: {
                                        '0%, 100%': { transform: 'scale(1)', opacity: '1' },
                                        '50%': { transform: 'scale(1.05)', opacity: '0.9' }
                                },
                                sparkle: {
                                        '0%': { transform: 'scale(0) rotate(0deg)', opacity: '0' },
                                        '50%': { transform: 'scale(1) rotate(180deg)', opacity: '1' },
                                        '100%': { transform: 'scale(0) rotate(360deg)', opacity: '0' }
                                },
                                float: {
                                        '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                                        '33%': { transform: 'translateY(-10px) rotate(1deg)' },
                                        '66%': { transform: 'translateY(5px) rotate(-1deg)' }
                                },
                                breathe: {
                                        '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
                                        '50%': { transform: 'scale(1.1)', opacity: '1' }
                                },
                                ripple: {
                                        '0%': { transform: 'scale(1)', opacity: '1' },
                                        '100%': { transform: 'scale(1.5)', opacity: '0' }
                                },
                                glow: {
                                        '0%, 100%': { boxShadow: '0 0 20px rgba(102, 175, 140, 0.3)' },
                                        '50%': { boxShadow: '0 0 40px rgba(102, 175, 140, 0.5)' }
                                },
                                wave: {
                                        '0%, 100%': { transform: 'translateY(0) rotateZ(0deg)' },
                                        '25%': { transform: 'translateY(-5px) rotateZ(1deg)' },
                                        '75%': { transform: 'translateY(5px) rotateZ(-1deg)' }
                                },
                                shimmer: {
                                        '0%': { backgroundPosition: '-200% 0' },
                                        '100%': { backgroundPosition: '200% 0' }
                                },
                                fadeInUp: {
                                        '0%': { opacity: '0', transform: 'translateY(20px)' },
                                        '100%': { opacity: '1', transform: 'translateY(0)' }
                                },
                                scaleFade: {
                                        '0%': { opacity: '0', transform: 'scale(0.9)' },
                                        '100%': { opacity: '1', transform: 'scale(1)' }
                                }
                        },
                        animation: {
                                'accordion-down': 'accordion-down 0.2s ease-out',
                                'accordion-up': 'accordion-up 0.2s ease-out',
                                'slide-in-right': 'slideInRight 0.3s ease-out',
                                'calendar-pulse': 'calendarPulse 2s ease-in-out infinite',
                                'sparkle': 'sparkle 3s ease-in-out infinite',
                                'float': 'float 6s ease-in-out infinite',
                                'breathe': 'breathe 4s ease-in-out infinite',
                                'ripple': 'ripple 1s ease-out',
                                'glow': 'glow 3s ease-in-out infinite alternate',
                                'wave': 'wave 4s ease-in-out infinite',
                                'shimmer': 'shimmer 2s linear infinite',
                                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                                'scale-fade': 'scaleFade 0.3s ease-out forwards'
                        }
                }
        },
        plugins: [require("tailwindcss-animate")],
} satisfies Config;
