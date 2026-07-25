Pod::Spec.new do |s|
  s.name = 'WatchifyScreenShare'
  s.version = '0.1.0'
  s.summary = 'ReplayKit screen share bridge for Watchify Capacitor iOS'
  s.license = 'Proprietary'
  s.homepage = 'https://github.com/shiftmind/watchify'
  s.author = 'Watchify'
  s.source = { :git => 'https://github.com/shiftmind/watchify.git', :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m,c,cc,mm,cpp}', 'ios/Shared/**/*.{swift}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
