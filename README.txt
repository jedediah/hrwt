* What's HRWT?

HRWT (HotRuby Web Toolkit) is Ruby VM on JavaScript (HotRuby with more feature, see below) + DRb-ish RPC.

Hopefully this will be a framework which is Ruby version of GWT (Google Web Toolkit) in the future,
which enables you to write whole Web application (both client and server) in Ruby, without JavaScript.

But currently this is EXPERIMENTAL and not useful for practical use.

Demo: http://gimite.net/rwt_demo/console


* How to use

To start server, run:
$ ruby hrwt_server.rb --port 12007

and try:
http://localhost:12007/chat
http://localhost:12007/console

Edit files in app/ to modify the applications.

Ruby must be 1.9.0-1 (2008-03-01 revision 15660):
ftp://ftp.ruby-lang.org/pub/ruby/1.9/


* Modification to HotRuby

Modified HotRuby is in js/hot_ruby_*.js. I implemented some of Ruby features missing in original HotRuby, and fixed several bugs. Newly implemented features are:

- Synchronous call to asynchronous JavaScript functions (e.g. Ajax, setTimeout)
- Many additional Ruby builtin methods imported from Rubinius (lib/core/*.rb, still in progress)
- Pseudo thread
- Exceptions
- break/return in blocks
- Modules
- yield (invokeblock)
- *, & in parameters and default arguments
- method_missing
- Singleton classes


* Licence / Copyright

js/hot_ruby_*.js:
  Ruby Licence
  Author: id:yukoba (http://hotruby.accelart.jp/)

js/prototype-1.6.0.2.js:
  See the file

lib/core/*:
  Taken from Rubinius (http://rubini.us/)

Others:
  Ruby Licence
  Author: Hiroshi Ichikawa (Gimite) (http://gimite.net/)
