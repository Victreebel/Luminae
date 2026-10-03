#import <AppKit/AppKit.h>
#import <CoreImage/CoreImage.h>
#import <Vision/Vision.h>

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    if (argc != 3) {
      fprintf(stderr, "Usage: extract-foreground <input-image> <output-png>\n");
      return 2;
    }

    NSString *inputPath = [NSString stringWithUTF8String:argv[1]];
    NSString *outputPath = [NSString stringWithUTF8String:argv[2]];
    NSImage *image = [[NSImage alloc] initWithContentsOfFile:inputPath];
    if (!image) {
      fprintf(stderr, "Could not read image: %s\n", argv[1]);
      return 1;
    }

    NSRect imageRect = NSMakeRect(0, 0, image.size.width, image.size.height);
    CGImageRef cgImage = [image CGImageForProposedRect:&imageRect context:nil hints:nil];
    if (!cgImage) {
      fprintf(stderr, "Could not decode image pixels: %s\n", argv[1]);
      return 1;
    }

    VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cgImage options:@{}];
    VNGenerateForegroundInstanceMaskRequest *request = [[VNGenerateForegroundInstanceMaskRequest alloc] init];
    NSError *error = nil;
    if (![handler performRequests:@[request] error:&error]) {
      fprintf(stderr, "Vision request failed: %s\n", error.localizedDescription.UTF8String);
      return 1;
    }

    VNInstanceMaskObservation *observation = request.results.firstObject;
    if (!observation || observation.allInstances.count == 0) {
      fprintf(stderr, "Vision found no foreground subject: %s\n", argv[1]);
      return 1;
    }

    CVPixelBufferRef foregroundBuffer = [observation
      generateMaskedImageOfInstances:observation.allInstances
      fromRequestHandler:handler
      croppedToInstancesExtent:NO
      error:&error];
    if (!foregroundBuffer) {
      fprintf(stderr, "Foreground extraction failed: %s\n", error.localizedDescription.UTF8String);
      return 1;
    }

    CIImage *foreground = [CIImage imageWithCVPixelBuffer:foregroundBuffer];
    CIContext *context = [CIContext contextWithOptions:@{kCIContextUseSoftwareRenderer: @NO}];
    CGImageRef outputCGImage = [context createCGImage:foreground fromRect:foreground.extent];
    CVPixelBufferRelease(foregroundBuffer);
    if (!outputCGImage) {
      fprintf(stderr, "Could not render transparent foreground: %s\n", argv[1]);
      return 1;
    }

    NSBitmapImageRep *bitmap = [[NSBitmapImageRep alloc] initWithCGImage:outputCGImage];
    CGImageRelease(outputCGImage);
    NSData *png = [bitmap representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
    if (!png) {
      fprintf(stderr, "Could not encode PNG: %s\n", argv[2]);
      return 1;
    }

    NSURL *outputURL = [NSURL fileURLWithPath:outputPath];
    [[NSFileManager defaultManager]
      createDirectoryAtURL:outputURL.URLByDeletingLastPathComponent
      withIntermediateDirectories:YES
      attributes:nil
      error:&error];
    if (error || ![png writeToURL:outputURL options:NSDataWritingAtomic error:&error]) {
      fprintf(stderr, "Could not write output: %s\n", error.localizedDescription.UTF8String);
      return 1;
    }
  }
  return 0;
}
