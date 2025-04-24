import os
import sys
from backgroundremover.bg import remove  # Changed import
from PIL import Image #Imported but not being used

def remove_background_from_image(input_path, output_path):
    """
    Removes the background from an image using the backgroundremover package,
    with specific parameters for the remove function.

    Args:
        input_path (str): The path to the input image file.
        output_path (str): The path to save the output image file with the background removed.
    """
    try:
        # Check if the input file exists
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Error: Input image not found at {input_path}")

        # Open the image file in binary read mode
        with open(input_path, "rb") as f:
            data = f.read()

        # Remove the background using backgroundremover with specific parameters
        img = remove(data,
                    model_name="u2net",  # You can change this to "u2net_human_seg" or "u2netp"
                    alpha_matting=True,
                    alpha_matting_foreground_threshold=240,
                    alpha_matting_background_threshold=10,
                    alpha_matting_erode_structure_size=10,
                    alpha_matting_base_size=1000)

        # Save the output image in binary write mode
        with open(output_path, "wb") as f:
            f.write(img)

        print(f"Background removed and saved to {output_path}")
        return True

    except FileNotFoundError as e:
        print(e)
        return False
    except Exception as e:
        print(f"An error occurred: {e}")
        return False

def main():
    """
    Main function to run the background removal process.
    Accepts command-line arguments for input and output paths.
    """
    # Check if arguments are provided
    if len(sys.argv) == 3:
        input_image_path = sys.argv[1]
        output_image_path = sys.argv[2]
    else:
        # Fall back to interactive mode if arguments are not provided
        input_image_path = input("Enter the path to the input image: ")
        output_image_path = input("Enter the path to save the output image (e.g., output.png): ")

    success = remove_background_from_image(input_image_path, output_image_path)
    # Return exit code based on success
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()