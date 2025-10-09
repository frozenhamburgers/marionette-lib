package net.jelly.marionette_lib.entity.examples.octopus;

import net.jelly.marionette_lib.utility.MultipartModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.*;

public class OctopusModel extends MultipartModel<OctopusEntity> {

    public static LayerDefinition createBodyLayer() {
        MeshDefinition meshdefinition = new MeshDefinition();
        PartDefinition partdefinition = meshdefinition.getRoot();

        PartDefinition bone = partdefinition.addOrReplaceChild("bone", CubeListBuilder.create().texOffs(-2, -2).addBox(-8.0F, -8.0F, -8.0F, 16.0F, 16.0F, 18.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone2 = partdefinition.addOrReplaceChild("bone2", CubeListBuilder.create().texOffs(-2, 30).addBox(-8.0F, -8.0F, -8.0F, 16.0F, 16.0F, 18.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone3 = partdefinition.addOrReplaceChild("bone3", CubeListBuilder.create().texOffs(-2, 62).addBox(-7.0F, -7.0F, -8.0F, 14.0F, 14.0F, 18.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone4 = partdefinition.addOrReplaceChild("bone4", CubeListBuilder.create().texOffs(62, -2).addBox(-7.0F, -7.0F, -8.0F, 14.0F, 14.0F, 18.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone5 = partdefinition.addOrReplaceChild("bone5", CubeListBuilder.create().texOffs(62, 28).addBox(-6.0F, -6.0F, -6.0F, 12.0F, 12.0F, 14.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone6 = partdefinition.addOrReplaceChild("bone6", CubeListBuilder.create().texOffs(62, 52).addBox(-6.0F, -6.0F, -6.0F, 12.0F, 12.0F, 14.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone7 = partdefinition.addOrReplaceChild("bone7", CubeListBuilder.create().texOffs(54, 76).addBox(-6.0F, -6.0F, -6.0F, 12.0F, 12.0F, 14.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone8 = partdefinition.addOrReplaceChild("bone8", CubeListBuilder.create().texOffs(-2, 92).addBox(-6.0F, -6.0F, -6.0F, 12.0F, 12.0F, 14.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone9 = partdefinition.addOrReplaceChild("bone9", CubeListBuilder.create().texOffs(46, 100).addBox(-5.0F, -5.0F, -5.0F, 10.0F, 10.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone10 = partdefinition.addOrReplaceChild("bone10", CubeListBuilder.create().texOffs(86, 100).addBox(-5.0F, -5.0F, -5.0F, 10.0F, 10.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone11 = partdefinition.addOrReplaceChild("bone11", CubeListBuilder.create().texOffs(102, 76).addBox(-5.0F, -5.0F, -5.0F, 10.0F, 10.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone12 = partdefinition.addOrReplaceChild("bone12", CubeListBuilder.create().texOffs(110, 28).addBox(-5.0F, -5.0F, -5.0F, 10.0F, 10.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone13 = partdefinition.addOrReplaceChild("bone13", CubeListBuilder.create().texOffs(110, 48).addBox(-5.0F, -5.0F, -5.0F, 10.0F, 10.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone14 = partdefinition.addOrReplaceChild("bone14", CubeListBuilder.create().texOffs(-2, 116).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone15 = partdefinition.addOrReplaceChild("bone15", CubeListBuilder.create().texOffs(118, -2).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone16 = partdefinition.addOrReplaceChild("2bone", CubeListBuilder.create().texOffs(-2, -2).addBox(-8.0F, -8.0F, -8.0F, 16.0F, 16.0F, 18.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone17 = partdefinition.addOrReplaceChild("2bone2", CubeListBuilder.create().texOffs(-2, 30).addBox(-8.0F, -8.0F, -8.0F, 16.0F, 16.0F, 18.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone18 = partdefinition.addOrReplaceChild("2bone3", CubeListBuilder.create().texOffs(-2, 62).addBox(-7.0F, -7.0F, -8.0F, 14.0F, 14.0F, 18.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone19 = partdefinition.addOrReplaceChild("2bone4", CubeListBuilder.create().texOffs(62, -2).addBox(-7.0F, -7.0F, -8.0F, 14.0F, 14.0F, 18.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone20 = partdefinition.addOrReplaceChild("2bone5", CubeListBuilder.create().texOffs(62, 28).addBox(-6.0F, -6.0F, -6.0F, 12.0F, 12.0F, 14.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone21 = partdefinition.addOrReplaceChild("2bone6", CubeListBuilder.create().texOffs(62, 52).addBox(-6.0F, -6.0F, -6.0F, 12.0F, 12.0F, 14.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone22 = partdefinition.addOrReplaceChild("2bone7", CubeListBuilder.create().texOffs(54, 76).addBox(-6.0F, -6.0F, -6.0F, 12.0F, 12.0F, 14.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone23 = partdefinition.addOrReplaceChild("2bone8", CubeListBuilder.create().texOffs(-2, 92).addBox(-6.0F, -6.0F, -6.0F, 12.0F, 12.0F, 14.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone24 = partdefinition.addOrReplaceChild("2bone9", CubeListBuilder.create().texOffs(46, 100).addBox(-5.0F, -5.0F, -5.0F, 10.0F, 10.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone25 = partdefinition.addOrReplaceChild("2bone10", CubeListBuilder.create().texOffs(86, 100).addBox(-5.0F, -5.0F, -5.0F, 10.0F, 10.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone26 = partdefinition.addOrReplaceChild("2bone11", CubeListBuilder.create().texOffs(102, 76).addBox(-5.0F, -5.0F, -5.0F, 10.0F, 10.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone27 = partdefinition.addOrReplaceChild("2bone12", CubeListBuilder.create().texOffs(110, 28).addBox(-5.0F, -5.0F, -5.0F, 10.0F, 10.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone28 = partdefinition.addOrReplaceChild("2bone13", CubeListBuilder.create().texOffs(110, 48).addBox(-5.0F, -5.0F, -5.0F, 10.0F, 10.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone29 = partdefinition.addOrReplaceChild("2bone14", CubeListBuilder.create().texOffs(-2, 116).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone30 = partdefinition.addOrReplaceChild("2bone15", CubeListBuilder.create().texOffs(118, -2).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 12.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));


        return LayerDefinition.create(meshdefinition, 256, 256);
    }


    public OctopusModel(ModelPart root) {
        // segment names. names of the folders containing the geometry of each animatable segment in blockbench
        super(root, new String[]
                {"bone", "bone2", "bone3", "bone4", "bone5", "bone6", "bone7", "bone8", "bone9", "bone10",
                "bone11", "bone12", "bone13", "bone14", "bone15",
                        "2bone", "2bone2", "2bone3", "2bone4", "2bone5", "2bone6", "2bone7", "2bone8", "2bone9", "2bone10",
                        "2bone11", "2bone12", "2bone13", "2bone14", "2bone15"});
    }

}
