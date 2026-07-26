#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LogFileModule, NSObject)

RCT_EXTERN_METHOD(shareTextFile:(NSString *)fileName
                  contents:(NSString *)contents
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
