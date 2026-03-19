import React from 'react';
import { handleLogin } from './actions';

export default function LoginPage() {
    return (
        <div className="vertical-layout vertical-menu-collapsible page-header-dark vertical-modern-menu 2-columns login-bg h-screen overflow-hidden">
            <link rel="apple-touch-icon" href="https://eservices.muranga.go.ke/images/favicon/apple-touch-icon-152x152.png" />
            <link rel="shortcut icon" type="image/x-icon" href="https://eservices.muranga.go.ke/images/favicon/favicon-32x32.png" />
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
            <link rel="stylesheet" type="text/css" href="https://eservices.muranga.go.ke/vendors/vendors.min.css" />
            <link rel="stylesheet" type="text/css" href="https://eservices.muranga.go.ke/css/themes/vertical-modern-menu-template/materialize.css" />
            <link rel="stylesheet" type="text/css" href="https://eservices.muranga.go.ke/css/themes/vertical-modern-menu-template/style.css" />
            <link rel="stylesheet" type="text/css" href="https://eservices.muranga.go.ke/css/pages/login.css" />
            <link rel="stylesheet" type="text/css" href="https://eservices.muranga.go.ke/css/laravel-custom.css" />
            <link rel="stylesheet" type="text/css" href="https://eservices.muranga.go.ke/css/custom/custom.css" />

            <div className="row">
                <div className="col s12">
                    <div className="container">
                        <div id="login-page" className="row">
                            <div className="col s12 m6 l4 z-depth-4 card-panel border-radius-6 login-card bg-opacity-8">
                                <form className="login-form" action={handleLogin} method="POST">
                                    <div className="row">
                                        <div className="input-field center">
                                            <img src="https://eservices.muranga.go.ke/images/logo/murangalogo.png" alt="" />
                                            <h5 className="">Murang'a County E-Service Portal</h5>
                                            <h6 className="mt-4">Sign In</h6>
                                        </div>
                                    </div>
                                    <div className="center"></div>
                                    <div className="row margin">
                                        <div className="input-field col s12">
                                            <i className="material-icons prefix pt-2">person_outline</i>
                                            <input id="username" type="text" name="email_phone" required />
                                            <label htmlFor="username" className="center-align">Email / Phone Number</label>
                                        </div>
                                    </div>
                                    <div className="row margin">
                                        <div className="input-field col s12">
                                            <i className="material-icons prefix pt-2">lock_outline</i>
                                            <input id="password" type="password" name="password" required />
                                            <label htmlFor="password">Password</label>
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col m12 s12 file-field input-field">
                                            <p><label>Select portal you want to log into</label></p>
                                            <p><label>
                                                <input name="portal" value="sbp" type="radio" defaultChecked />
                                                <span>Single Business Permit </span>
                                            </label></p>
                                            <p><label>
                                                <input name="portal" value="liquor" type="radio" />
                                                <span>Liquor Application </span>
                                            </label></p>
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col s12 m12 l12 ml-2 mt-1">
                                            <p>
                                                <label>
                                                    <input type="checkbox" />
                                                    <span>Remember Me</span>
                                                </label>
                                            </p>
                                        </div>
                                        <div className="input-field col s12">
                                            <div className="input-field col s5">
                                                <p className="margin medium-small">
                                                    <a href="https://eservices.muranga.go.ke/register">Create an account</a>
                                                </p>
                                            </div>
                                            <div className="input-field col s7">
                                                <p className="margin medium-small">
                                                    <a href="https://eservices.muranga.go.ke/login-with-otp">Forgot Password ? Get OTP </a>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="input-field col s12">
                                            <button type="submit" className="btn waves-effect waves-light border-round gradient-45deg-purple-deep-orange col s12">
                                                Login
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="content-overlay"></div>
                </div>
            </div>
            {/* Scripts handle via next/script in a real app, but for this mock we can keep them like this or rely on global layout */}
            <script src="https://eservices.muranga.go.ke/js/vendors.min.js" async></script>
            <script src="https://eservices.muranga.go.ke/js/plugins.js" async></script>
            <script src="https://eservices.muranga.go.ke/js/search.js" async></script>
            <script src="https://eservices.muranga.go.ke/js/custom/custom-script.js" async></script>
            <script src="https://eservices.muranga.go.ke/js/scripts/advance-ui-modals.js" async></script>
        </div>
    );
}
